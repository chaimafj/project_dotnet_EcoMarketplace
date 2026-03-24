import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../Services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);

  loading = false;
  successMessage = '';
  errorMessage = '';
  accountRoles = [
    { value: 'Buyer', label: 'Acheteur' },
    { value: 'Seller', label: 'Vendeur' }
  ];

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Buyer', [Validators.required]],
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires avant de creer le compte.';
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const firstName = this.form.value.firstName!;
    const lastName = this.form.value.lastName!;
    const email = this.form.value.email!;
    const role = this.form.value.role!;
    const username = this.buildUsername(firstName, lastName, email);

    this.authService.register({
      firstName,
      lastName,
      username,
      email,
      password: this.form.value.password!,
      role,
    }).subscribe({
      next: () => {
        this.successMessage = 'Compte cree avec succes. Redirection vers la connexion...';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (error) => {
        if (error?.status === 0) {
          this.errorMessage = 'Serveur indisponible. Demarrez l API backend puis reessayez.';
        } else {
          this.errorMessage = error?.error?.message ?? 'Inscription impossible. Veuillez reessayer.';
        }
        this.loading = false;
      }
    });
  }

  private buildUsername(firstName: string, lastName: string, email: string): string {
    const compact = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (compact.length >= 3) return compact;

    const emailPrefix = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (emailPrefix && emailPrefix.length >= 3) return emailPrefix;

    return `eco${Date.now().toString().slice(-6)}`;
  }
}
