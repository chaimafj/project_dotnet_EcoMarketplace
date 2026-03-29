import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService, ProductFilter, Product } from '../../Services/product.service';
import { AuthService } from '../../Services/auth.service';
import { Router } from '@angular/router';
import { AdminService } from '../../Services/admin.service';
import { CartService } from '../../Services/cart.service';
import { FavoritesService } from '../../Services/favorites.service';

@Component({
  standalone: true,
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbPagination]
})
export class MarketplaceComponent implements OnInit {
  products: Product[] = [];
  imageIndexes: Record<string, number> = {};
  filterForm: FormGroup;
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  totalCount = 0;
  loading = false;
  validatingProductId: string | number | null = null;
  purchaseMessage = '';
  favoriteProductIds = new Set<string>();
  categories = ['Electronics', 'Textile', 'Furniture', 'Books', 'Sports', 'Other'];
  ecoScoreRanges = [
    { label: 'All', min: 0 },
    { label: 'Excellent (80-100)', min: 80 },
    { label: 'Moderate (50-79)', min: 50 },
    { label: 'Low (0-49)', min: 0, max: 49 }
  ];

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      category: [''],
      minEcoScore: [0],
      maxPrice: ['']
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.syncFavorites();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadProducts();
      });
  }

  loadProducts(): void {
    this.loading = true;

    const filter: ProductFilter = {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.filterForm.get('search')?.value,
      category: this.filterForm.get('category')?.value,
      minEcoScore: this.filterForm.get('minEcoScore')?.value,
      maxPrice: this.filterForm.get('maxPrice')?.value
    };

    this.productService.getProducts(filter).subscribe({
      next: (response) => {
        const items = this.extractItems(response);
        this.products = items.map((product) => this.normalizeProduct(product));
        this.syncFavorites();
        this.totalCount = response?.totalCount ?? this.products.length;
        this.totalPages = response?.totalPages ?? 1;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products = [];
        this.totalCount = 0;
        this.totalPages = 1;
        this.loading = false;
      }
    });
  }

  private extractItems(response: any): Product[] {
    if (Array.isArray(response)) return response as Product[];
    if (Array.isArray(response?.items)) return response.items as Product[];
    if (Array.isArray(response?.Items)) return response.Items as Product[];
    return [];
  }

  private normalizeProduct(product: Product): Product {
    const id = (product as any)?.id ?? (product as any)?.Id ?? '';
    const sellerId = (product as any)?.sellerId ?? (product as any)?.SellerId ?? '';
    const image = (product as any)?.image ?? (product as any)?.Image;
    const images = Array.isArray((product as any)?.images)
      ? (product as any).images
      : Array.isArray((product as any)?.Images)
        ? (product as any).Images
        : [];
    const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';

    return {
      ...product,
      id,
      title: product?.title ?? 'Produit sans titre',
      description: product?.description ?? 'Aucune description disponible.',
      sellerId,
      sellerName: (product as any)?.sellerName ?? (product as any)?.SellerName ?? 'Vendeur inconnu',
      image: image || images[0] || fallbackImage,
      images: images.length ? images : [fallbackImage],
      location: product?.location ?? 'Non précisée',
      category: product?.category ?? 'Other',
      condition: product?.condition ?? 'Good',
      material: product?.material ?? 'N/A',
      ecoScore: Number(product?.ecoScore ?? 0),
      recycledPercentage: Number(product?.recycledPercentage ?? 0),
      carbonFootprint: Number(product?.carbonFootprint ?? 0),
      isRecycled: !!product?.isRecycled,
      isSustainable: !!product?.isSustainable,
      price: Number(product?.price ?? 0),
      currency: (product as any)?.currency ?? (product as any)?.Currency ?? 'DT'
    };
  }

  getCurrentProductImage(product: Product): string {
    const images = product.images?.length ? product.images : [product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'];
    const index = this.imageIndexes[String(product.id)] ?? 0;
    return images[index] || images[0];
  }

  showImageNavigation(product: Product): boolean {
    return (product.images?.length ?? 0) > 1;
  }

  getCurrentImagePosition(product: Product): number {
    return (this.imageIndexes[String(product.id)] ?? 0) + 1;
  }

  previousImage(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const images = product.images?.length ? product.images : [product.image || ''];
    const key = String(product.id);
    const currentIndex = this.imageIndexes[key] ?? 0;
    this.imageIndexes[key] = (currentIndex - 1 + images.length) % images.length;
  }

  nextImage(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const images = product.images?.length ? product.images : [product.image || ''];
    const key = String(product.id);
    const currentIndex = this.imageIndexes[key] ?? 0;
    this.imageIndexes[key] = (currentIndex + 1) % images.length;
  }

  onProductImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }

  addToCart(product: Product): void {
    this.purchaseMessage = '';

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.purchaseMessage = 'Session indisponible. Veuillez vous reconnecter.';
      return;
    }

    const role = (currentUser.role || '').toLowerCase();
    if (role === 'seller') {
      this.purchaseMessage = 'Un vendeur ne peut pas acheter depuis ce compte. Utilisez un compte acheteur.';
      return;
    }

    if (role === 'admin') {
      this.purchaseMessage = 'Compte administrateur détecté. Veuillez utiliser un compte acheteur pour commander.';
      return;
    }

    if (String(product.sellerId) === String(currentUser.id)) {
      this.purchaseMessage = 'Vous ne pouvez pas acheter votre propre produit.';
      return;
    }

    this.cartService.addProduct(product);
    this.purchaseMessage = 'Produit ajouté au panier.';
  }

  toggleFavorite(product: Product): void {
    this.purchaseMessage = '';

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
      return;
    }

    const role = (this.authService.getCurrentUser()?.role || '').toLowerCase();
    if (role !== 'buyer') {
      this.purchaseMessage = 'Seuls les acheteurs peuvent utiliser les favoris.';
      return;
    }

    const isNowFavorite = this.favoritesService.toggleFavorite(product);
    this.syncFavorites();
    this.purchaseMessage = isNowFavorite
      ? 'Produit ajoute aux favoris.'
      : 'Produit retire des favoris.';
  }

  isFavorite(product: Product): boolean {
    return this.favoriteProductIds.has(String(product.id));
  }

  canShowFavoriteActions(): boolean {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.getCurrentUser()?.role?.toLowerCase();
    return role === 'buyer';
  }

  private syncFavorites(): void {
    this.favoriteProductIds = new Set(
      this.favoritesService.getFavorites().map((p) => String(p.id))
    );
  }

  canShowCartActions(): boolean {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.getCurrentUser()?.role?.toLowerCase();
    return role === 'buyer';
  }

  isOwnProduct(product: Product): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;
    return String(product.sellerId) === String(currentUser.id);
  }

  hasProductId(product: Product): boolean {
    return product?.id !== undefined && product?.id !== null && String(product.id).trim() !== '';
  }

  canCurrentUserBuy(product: Product): boolean {
    if (!this.authService.isAuthenticated()) return true;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    const role = (currentUser.role || '').toLowerCase();
    if (role !== 'buyer') return false;
    return String(product.sellerId) !== String(currentUser.id);
  }

  getBuyButtonLabel(product: Product): string {
    if (!this.authService.isAuthenticated()) return 'Se connecter pour acheter';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return 'Session indisponible';

    if (String(product.sellerId) === String(currentUser.id)) return 'Votre produit';

    const role = (currentUser.role || '').toLowerCase();
    if (role === 'seller') return 'Compte vendeur';
    if (role === 'admin') return 'Compte admin';

    return 'Ajouter au panier';
  }

  isAdminUser(): boolean {
    const user = this.authService.getCurrentUser();
    return (user?.role || '').toLowerCase() === 'admin';
  }

  validateProduct(product: Product): void {
    if (!this.isAdminUser()) return;

    this.validatingProductId = product.id;
    this.adminService.validateProduct(product.id).subscribe({
      next: (response) => {
        this.purchaseMessage = response?.message || 'Produit validé.';
        this.validatingProductId = null;
        this.loadProducts();
      },
      error: () => {
        this.purchaseMessage = 'Validation impossible pour le moment.';
        this.validatingProductId = null;
      }
    });
  }

  getEcoScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 50) return 'moderate';
    return 'low';
  }

  formatPriceWithCurrency(price: number, currency?: string): string {
    return `${Number(price || 0).toFixed(2)} DT`;
  }
}
