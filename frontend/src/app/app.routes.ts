import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { MarketplaceComponent } from './features/marketplace/marketplace.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ProductDetailComponent } from './features/product-detail/product-detail.component';
import { RegisterComponent } from './features/register/register.component';
import { ResetPasswordComponent } from './features/reset-password/reset-password.component';
import { SellerDashboardComponent } from './features/seller-dashboard/seller-dashboard.component';
import { BuyerDashboardComponent } from './features/buyer-dashboard/buyer-dashboard.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { SellerProductsComponent } from './features/seller-products/seller-products.component';
import { CartComponent } from './features/cart/cart.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'buyer-dashboard', component: BuyerDashboardComponent, canActivate: [authGuard, roleGuard(['buyer'])] },
  { path: 'seller-dashboard', component: SellerDashboardComponent, canActivate: [authGuard, roleGuard(['seller'])] },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'products', component: MarketplaceComponent },
  { path: 'cart', component: CartComponent, canActivate: [authGuard, roleGuard(['buyer'])] },
  { path: 'seller/:id', component: SellerProductsComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: '**', redirectTo: 'home' },
];
