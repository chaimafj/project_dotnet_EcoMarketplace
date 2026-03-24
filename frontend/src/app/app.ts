import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './Services/auth.service';
import { CartService } from './Services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(
    public authService: AuthService,
    private cartService: CartService
  ) {}

  getDashboardRoute(): string {
    const role = this.authService.getCurrentUser()?.role?.toLowerCase();
    if (role === 'admin') return '/admin-dashboard';
    if (role === 'seller') return '/seller-dashboard';
    return '/buyer-dashboard';
  }

  logout(): void {
    this.authService.logout();
  }

  isBuyer(): boolean {
    const role = this.authService.getCurrentUser()?.role?.toLowerCase();
    return role === 'buyer';
  }

  getCartCount(): number {
    return this.cartService.getCount();
  }
}
