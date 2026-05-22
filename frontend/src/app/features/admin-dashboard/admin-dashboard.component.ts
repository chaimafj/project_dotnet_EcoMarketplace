import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeoutError } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { AuthService } from '../../Services/auth.service';
import {
  AdminProduct,
  AdminService,
  AdminStats,
  AdminUser,
  CurrencyAmount
} from '../../Services/admin.service';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  availableProducts: number;
  totalTransactions: number;
  revenueByCurrency: CurrencyAmount[];
  averageSalesPerProduct: number;
  environmentalImpact: {
    totalCO2Saved: number;
    averageRecycledPercentage: number;
    productsValidated: number;
  };
}

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  currentTab: 'overview' | 'users' | 'products' | 'stats' = 'overview';
  
  user: any;
  loading = false;
  
  // Statistics
  platformStats: PlatformStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    availableProducts: 0,
    totalTransactions: 0,
    revenueByCurrency: [],
    averageSalesPerProduct: 0,
    environmentalImpact: {
      totalCO2Saved: 0,
      averageRecycledPercentage: 0,
      productsValidated: 0
    }
  };

  users: AdminUser[] = [];
  products: AdminProduct[] = [];
  productsLoadError = '';
  
  searchQuery = '';
  filterRole = 'all';
  showAllProducts = false;

  constructor(
    public authService: AuthService,
    private adminService: AdminService
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadPlatformStats();
  }

  setTab(tab: 'overview' | 'users' | 'products' | 'stats'): void {
    this.currentTab = tab;
    if (tab === 'users') this.loadUsers();
    if (tab === 'products') {
      this.showAllProducts = false;
      this.loadProducts();
    }
    if (tab === 'stats') this.loadPlatformStats();
  }

  loadPlatformStats(): void {
    this.adminService.getStats().subscribe({
      next: (stats: AdminStats) => {
        this.platformStats = {
          totalUsers: stats.totalUsers,
          activeUsers: stats.activeUsers,
          totalProducts: stats.totalProducts,
          availableProducts: stats.availableProducts,
          totalTransactions: stats.totalTransactions,
          revenueByCurrency: stats.revenueByCurrency ?? [],
          averageSalesPerProduct: stats.averageSalesPerProduct,
          environmentalImpact: {
            totalCO2Saved: stats.totalCO2Saved,
            averageRecycledPercentage: stats.averageRecycledPercentage,
            productsValidated: stats.productsValidated
          }
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users ?? [];
        this.loading = false;
      },
      error: () => {
        this.users = [];
        this.loading = false;
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productsLoadError = '';

    this.adminService.getProducts()
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (products) => {
          this.products = products ?? [];
        },
        error: (error) => {
          this.products = [];
          if (error instanceof TimeoutError) {
            this.productsLoadError = 'Le chargement des produits a expire. Verifiez que le backend repond.';
            return;
          }

          this.productsLoadError = 'Impossible de charger les produits pour le moment.';
        }
      });
  }

  setProductDisplayMode(showAll: boolean): void {
    this.showAllProducts = showAll;
  }

  getDisplayedProducts(): AdminProduct[] {
    if (this.showAllProducts) return this.products;
    return this.products.filter((product) => !this.isProductValidated(product));
  }

  getFilteredUsers(): AdminUser[] {
    return this.users.filter(u => {
      const matchQuery = u.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        u.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        u.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.filterRole === 'all'
        ? (u.role === 'Buyer' || u.role === 'Seller' || u.role === 'Admin')
        : u.role === this.filterRole;
      return matchQuery && matchRole;
    });
  }

  isAdminUser(user: AdminUser): boolean {
    return String(user.role || '').toLowerCase() === 'admin';
  }

  getStatusBadgeClass(status: string): string {
    return {
      'active': 'badge-success',
      'inactive': 'badge-warning'
    }[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    return {
      'active': 'Actif',
      'inactive': 'Inactif'
    }[status] || status;
  }

  changeUserStatus(user: AdminUser, newStatus: 'active' | 'inactive' | 'banned'): void {
    if (this.isAdminUser(user)) return;

    const previous = user.status;
    const requestStatus: 'active' | 'inactive' = newStatus === 'banned' ? 'inactive' : newStatus;
    user.status = requestStatus;

    this.adminService.updateUserStatus(user.id, requestStatus).subscribe({
      next: () => {
        this.loadPlatformStats();
      },
      error: () => {
        user.status = previous;
      }
    });
  }

  deleteUser(userid: number): void {
    const targetUser = this.users.find((u) => u.id === userid);
    if (targetUser && this.isAdminUser(targetUser)) return;

    this.adminService.deleteUser(userid).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== userid);
        this.loadPlatformStats();
      }
    });
  }

  approveProduct(productId: string | number): void {
    this.adminService.validateProduct(Number(productId)).subscribe({
      next: () => {
        this.loadProducts();
        this.loadPlatformStats();
      }
    });
  }

  isProductValidated(product: AdminProduct): boolean {
    return (product.status || '').toLowerCase() === 'available';
  }

  rejectProduct(productId: string | number): void {
    const confirmed = confirm('Supprimer définitivement ce produit ? Cette action est irreversible.');
    if (!confirmed) return;

    this.adminService.deleteProduct(Number(productId)).subscribe({
      next: () => {
        this.products = this.products.filter(p => p.id !== Number(productId));
        this.loadPlatformStats();
      }
    });
  }

  formatRevenueByCurrency(): string {
    if (!this.platformStats.revenueByCurrency.length) return '0.00 DT';

    const total = this.platformStats.revenueByCurrency
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return this.formatPriceWithCurrency(total, 'DT');
  }

  formatPriceWithCurrency(amount: number, currency?: string): string {
    return `${Number(amount || 0).toFixed(2)} DT`;
  }

  get conversionRate(): number {
    if (!this.platformStats.totalUsers) return 0;
    return (this.platformStats.totalTransactions / this.platformStats.totalUsers) * 100;
  }

  get activeUserRate(): number {
    if (!this.platformStats.totalUsers) return 0;
    return (this.platformStats.activeUsers / this.platformStats.totalUsers) * 100;
  }

  get moderationQueueCount(): number {
    return Math.max(this.platformStats.totalProducts - this.platformStats.availableProducts, 0);
  }

  getProductStatusClass(status: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'available') return 'pill success';
    if (normalized === 'pending') return 'pill warning';
    return 'pill';
  }
}
