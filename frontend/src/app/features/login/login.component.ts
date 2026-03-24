import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { AuthService } from '../../Services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private readonly loginTimeoutMs = 10000;

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Veuillez saisir un email valide et un mot de passe (minimum 6 caracteres).';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.form.value.email!,
      password: this.form.value.password!,
    }).pipe(
      timeout(this.loginTimeoutMs),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }

        const role = this.authService.getCurrentUser()?.role?.toLowerCase();
        
        // Route based on user role
        if (role === 'seller') {
          this.router.navigateByUrl('/seller-dashboard');
          return;
        }

        if (role === 'admin') {
          this.router.navigateByUrl('/admin-dashboard');
          return;
        }

        if (role === 'buyer') {
          this.router.navigateByUrl('/buyer-dashboard');
          return;
        }

        // Default fallback to buyer dashboard
        this.router.navigateByUrl('/buyer-dashboard');
      },
      error: (error) => {
        if (error instanceof TimeoutError) {
          this.errorMessage = 'La connexion prend trop de temps. Verifiez que l API backend est demarree.';
          return;
        }

        if (error?.status === 0) {
          this.errorMessage = 'Serveur indisponible. Demarrez l API backend puis reessayez.';
        } else {
          this.errorMessage = error?.error?.message ?? 'Connexion impossible. Verifiez vos identifiants.';
        }
      }
    });
  }
}
