import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../Services/auth.service';
import { ProductService, Product } from '../../Services/product.service';
import { TransactionService } from '../../Services/transaction.service';
import { CartService } from '../../Services/cart.service';
import { UserService } from '../../Services/user.service';
import { FavoritesService } from '../../Services/favorites.service';

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
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './buyer-dashboard.component.html',
  styleUrl: './buyer-dashboard.component.scss'
})
export class BuyerDashboardComponent implements OnInit {
  currentTab: 'profile' | 'orders' | 'écopoints' | 'recommended' = 'profile';
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';
  
  user: any;
  loading = false;
  orders: Order[] = [];
  recommendedProducts: Product[] = [];
  favoriteProducts: Product[] = [];
  recommendationMessage = '';
  profileSaveMessage = '';
  savingProfile = false;
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
  private readonly fb = inject(FormBuilder);

  profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: [{ value: '', disabled: true }],
  });

  constructor(
    public authService: AuthService,
    private productService: ProductService,
    private transactionService: TransactionService,
    private cartService: CartService,
    private userService: UserService,
    private favoritesService: FavoritesService
  ) {
    this.user = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.syncProfileForm();
    this.loadFavoriteProducts();
    this.loadOrders();
    this.loadRecommendedProducts();
  }

  private syncProfileForm(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    this.profileForm.patchValue({
      firstName: currentUser.firstName ?? '',
      lastName: currentUser.lastName ?? '',
      email: currentUser.email ?? '',
    });
  }

  setTab(tab: 'profile' | 'orders' | 'écopoints' | 'recommended'): void {
    this.currentTab = tab;
    if (tab === 'profile') {
      this.loadFavoriteProducts();
    }
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
        const allProducts = ((response?.items ?? []) as Product[]).map((product) => this.normalizeProduct(product));
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

  private normalizeProduct(product: Product): Product {
    const images = Array.isArray((product as any)?.images)
      ? (product as any).images
      : Array.isArray((product as any)?.Images)
        ? (product as any).Images
        : [];

    const image = (product as any)?.image ?? (product as any)?.Image ?? images[0] ?? this.fallbackImage;

    return {
      ...product,
      id: (product as any)?.id ?? (product as any)?.Id,
      sellerId: (product as any)?.sellerId ?? (product as any)?.SellerId,
      sellerName: (product as any)?.sellerName ?? (product as any)?.SellerName ?? 'Vendeur inconnu',
      image,
      images,
      title: (product as any)?.title ?? (product as any)?.Title ?? 'Produit',
      description: (product as any)?.description ?? (product as any)?.Description ?? '',
      price: Number((product as any)?.price ?? (product as any)?.Price ?? 0),
      ecoScore: Number((product as any)?.ecoScore ?? (product as any)?.EcoScore ?? 0),
    };
  }

  getRecommendedImage(product: Product): string {
    const images = Array.isArray(product.images) ? product.images : [];
    return product.image ?? images[0] ?? this.fallbackImage;
  }

  getRecommendedDescription(product: Product): string {
    const description = String(product.description ?? '');
    if (description.length <= 60) return description;
    return `${description.slice(0, 60)}...`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.fallbackImage;
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

  saveProfile(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.profileSaveMessage = 'Veuillez verifier les champs du profil.';
      return;
    }

    const formValue = this.profileForm.getRawValue();
    const firstName = String(formValue.firstName ?? '').trim();
    const lastName = String(formValue.lastName ?? '').trim();

    this.savingProfile = true;
    this.profileSaveMessage = '';

    this.userService.updateUser(currentUser.id, {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      profilePictureUrl: currentUser.profilePictureUrl,
    }).subscribe({
      next: () => {
        const updatedUser = {
          ...currentUser,
          firstName,
          lastName,
        };

        this.user = updatedUser;
        this.authService.updateCurrentUser(updatedUser);
        this.profileSaveMessage = 'Profil mis a jour avec succes.';
        this.savingProfile = false;
      },
      error: () => {
        this.profileSaveMessage = 'La sauvegarde du profil a echoue.';
        this.savingProfile = false;
      }
    });
  }

  loadFavoriteProducts(): void {
    this.favoriteProducts = this.favoritesService.getFavorites().map((product) => this.normalizeProduct(product));
  }

  removeFavorite(product: Product): void {
    this.favoritesService.removeFavorite(product.id);
    this.loadFavoriteProducts();
    this.profileSaveMessage = 'Produit retire des favoris.';
  }

  addFavoriteToCart(product: Product): void {
    this.cartService.addProduct(product);
    this.profileSaveMessage = 'Produit favori ajoute au panier.';
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
