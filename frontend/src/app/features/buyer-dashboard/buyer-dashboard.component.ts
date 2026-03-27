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

interface BuyerBadge {
  title: string;
  description: string;
  threshold: number;
  current: number;
  unit: string;
  unlocked: boolean;
  progress: number;
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
  private readonly badgeBlueprints = [
    {
      title: 'Nouveau membre',
      description: 'Créer un compte et commencer votre parcours responsable.',
      threshold: 1,
      unit: 'profil',
      current: () => this.user ? 1 : 0
    },
    {
      title: 'Acheteur engagé',
      description: 'Passer 3 commandes sur la marketplace.',
      threshold: 3,
      unit: 'commandes',
      current: () => this.orders.length
    },
    {
      title: 'Eco score 50',
      description: 'Atteindre un score éco de 50.',
      threshold: 50,
      unit: 'points de score',
      current: () => this.ecoScore
    },
    {
      title: 'Eco score 80',
      description: 'Atteindre un score éco excellent.',
      threshold: 80,
      unit: 'points de score',
      current: () => this.ecoScore
    },
    {
      title: 'Client durable',
      description: 'Cumuler 100 écoPoints.',
      threshold: 100,
      unit: 'écoPoints',
      current: () => this.totalPoints
    },
    {
      title: 'Ambassadeur',
      description: 'Cumuler 200 écoPoints.',
      threshold: 200,
      unit: 'écoPoints',
      current: () => this.totalPoints
    }
  ];

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

  get buyerName(): string {
    const fullName = `${this.user?.firstName ?? ''} ${this.user?.lastName ?? ''}`.trim();
    return fullName || this.user?.username || 'Acheteur';
  }

  get completedOrdersCount(): number {
    return this.orders.filter((order) => order.status === 'completed').length;
  }

  get totalSpent(): number {
    return this.orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  }

  get averageOrderValue(): number {
    if (!this.orders.length) return 0;
    return this.totalSpent / this.orders.length;
  }

  get ecoLevel(): string {
    if (this.totalPoints >= 200 || this.ecoScore >= 80) return 'Niveau avance';
    if (this.totalPoints >= 100 || this.ecoScore >= 50) return 'Niveau intermediaire';
    return 'Niveau debutant';
  }

  get ecoProgress(): number {
    return Math.min(this.ecoScore, 100);
  }

  get badges(): BuyerBadge[] {
    return this.badgeBlueprints.map((badge) => {
      const current = badge.current();
      const progress = Math.min(Math.round((current / badge.threshold) * 100), 100);

      return {
        title: badge.title,
        description: badge.description,
        threshold: badge.threshold,
        current,
        unit: badge.unit,
        unlocked: current >= badge.threshold,
        progress
      };
    });
  }

  get unlockedBadges(): BuyerBadge[] {
    return this.badges.filter((badge) => badge.unlocked);
  }

  get upcomingBadges(): BuyerBadge[] {
    return this.badges.filter((badge) => !badge.unlocked).slice(0, 3);
  }

  get nextGoal(): BuyerBadge | null {
    return this.badges.find((badge) => !badge.unlocked) ?? null;
  }

  formatPriceDT(amount: number): string {
    return `${Number(amount || 0).toFixed(2)} DT`;
  }
}
