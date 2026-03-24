import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../Services/auth.service';
import { ProductService, Product } from '../../Services/product.service';
import { TransactionService } from '../../Services/transaction.service';
import { CartService } from '../../Services/cart.service';

interface Order {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'completed' | 'cancelled';
  purchasedAt: Date;
}

@Component({
  standalone: true,
  selector: 'app-buyer-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './buyer-dashboard.component.html',
  styleUrl: './buyer-dashboard.component.scss'
})
export class BuyerDashboardComponent implements OnInit {
  currentTab: 'profile' | 'orders' | 'écopoints' | 'recommended' = 'profile';
  
  user: any;
  loading = false;
  orders: Order[] = [];
  recommendedProducts: Product[] = [];
  recommendationMessage = '';

  constructor(
    public authService: AuthService,
    private productService: ProductService,
    private transactionService: TransactionService,
    private cartService: CartService
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadRecommendedProducts();
  }

  setTab(tab: 'profile' | 'orders' | 'écopoints' | 'recommended'): void {
    this.currentTab = tab;
  }

  loadOrders(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.orders = [];
      this.loading = false;
      return;
    }

    this.transactionService.getByUser(currentUser.id).subscribe({
      next: (orders) => {
        this.orders = (orders ?? []).map(order => ({
          id: Number(order.id),
          productId: Number(order.productId),
          productName: order.productName,
          quantity: Number(order.quantity),
          totalPrice: Number(order.totalPrice),
          status: (order.status as 'pending' | 'completed' | 'cancelled') ?? 'pending',
          purchasedAt: new Date(order.purchasedAt)
        }));
        this.loading = false;
      },
      error: () => {
        this.orders = [];
        this.loading = false;
      }
    });
  }

  loadRecommendedProducts(): void {
    this.loading = true;
    this.productService.getProducts({ page: 1, pageSize: 6 }).subscribe({
      next: (response) => {
        const allProducts = (response?.items ?? []) as Product[];
        // Filter out user's own products and limit to 6
        const userId = String(this.user?.id);
        this.recommendedProducts = allProducts
          .filter(p => String(p.sellerId) !== userId)
          .slice(0, 6);
        this.loading = false;
      },
      error: () => {
        this.recommendedProducts = [];
        this.loading = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    return {
      'completed': 'badge-success',
      'pending': 'badge-warning',
      'cancelled': 'badge-danger'
    }[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    return {
      'completed': 'Complétée',
      'pending': 'En attente',
      'cancelled': 'Annulée'
    }[status] || status;
  }

  addRecommendedToCart(product: Product): void {
    this.cartService.addProduct(product);
    this.recommendationMessage = 'Produit ajoute au panier.';
  }

  get totalPoints(): number {
    return this.user?.totalPoints ?? 0;
  }

  get ecoScore(): number {
    return this.user?.ecoScore ?? 0;
  }

  get badges(): string[] {
    // Simulated badge assignment based on eco score
    const badges = [];
    if (this.ecoScore >= 100) badges.push('🌿 Écolo Confirmé');
    if (this.orders.length >= 5) badges.push('🛍️ Acheteur Loyal');
    if (this.totalPoints >= 200) badges.push('⭐ VIP');
    return badges.length > 0 ? badges : ['🆕 Nouveau Membre'];
  }
}
