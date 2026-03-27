import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  
  searchQuery = '';
  filterRole = 'all';

  constructor(
    public authService: AuthService,
    private adminService: AdminService
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadAdminData();
  }

  setTab(tab: 'overview' | 'users' | 'products' | 'stats'): void {
    this.currentTab = tab;
    if (tab === 'users') this.loadUsers();
    if (tab === 'products') this.loadProducts();
    if (tab === 'stats') this.loadDetailedStats();
  }

  loadAdminData(): void {
    this.loading = true;
    this.loadPlatformStats();
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
    this.adminService.getProducts().subscribe({
      next: (products) => {
        this.products = products ?? [];
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
      }
    });
  }

  loadDetailedStats(): void {
    this.loading = true;
    this.adminService.getStats().subscribe({
      next: (stats) => {
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

  getFilteredUsers(): AdminUser[] {
    return this.users.filter(u => {
      const matchQuery = u.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        u.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        u.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.filterRole === 'all' || u.role === this.filterRole;
      return matchQuery && matchRole;
    });
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
    const previous = user.status;
    user.status = newStatus === 'banned' ? 'inactive' : newStatus;

    this.adminService.updateUserStatus(user.id, newStatus).subscribe({
      next: () => {
        this.loadPlatformStats();
      },
      error: () => {
        user.status = previous;
      }
    });
  }

  deleteUser(userid: number): void {
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
}
