import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ProductService, Product } from '../../Services/product.service';
import { AuthService } from '../../Services/auth.service';
import { CartService } from '../../Services/cart.service';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  imports: [CommonModule, RouterModule]
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  currentImageIndex = 0;
  message = '';
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }

    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      this.loading = false;
      return;
    }

    this.loadProduct(numericId);
  }

  private normalizeProduct(product: any): Product {
    const images = Array.isArray(product?.images)
      ? product.images
      : Array.isArray(product?.Images)
        ? product.Images
        : [];

    const image = product?.image ?? product?.Image ?? images[0] ?? this.fallbackImage;

    return {
      ...product,
      id: product?.id ?? product?.Id,
      sellerId: product?.sellerId ?? product?.SellerId,
      sellerName: product?.sellerName ?? product?.SellerName ?? 'Vendeur inconnu',
      image,
      images: images.length ? images : [this.fallbackImage],
      title: product?.title ?? product?.Title ?? 'Produit',
      description: product?.description ?? product?.Description ?? 'Aucune description.',
      material: product?.material ?? product?.Material ?? 'N/A',
      location: product?.location ?? product?.Location ?? 'Non précisée',
      category: product?.category ?? product?.Category ?? 'Other',
      condition: product?.condition ?? product?.Condition ?? 'Good',
      ecoScore: Number(product?.ecoScore ?? product?.EcoScore ?? 0),
      price: Number(product?.price ?? product?.Price ?? 0),
      currency: product?.currency ?? product?.Currency ?? 'DT',
      carbonFootprint: Number(product?.carbonFootprint ?? product?.CarbonFootprint ?? 0),
      recycledPercentage: Number(product?.recycledPercentage ?? product?.RecycledPercentage ?? 0),
      isRecycled: !!(product?.isRecycled ?? product?.IsRecycled),
      isSustainable: !!(product?.isSustainable ?? product?.IsSustainable)
    };
  }

  getCurrentImage(): string {
    if (!this.product) return this.fallbackImage;
    return this.product.images?.[this.currentImageIndex] || this.product.image || this.fallbackImage;
  }

  hasMultipleImages(): boolean {
    return (this.product?.images?.length ?? 0) > 1;
  }

  previousImage(): void {
    if (!this.product?.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.product.images.length) % this.product.images.length;
  }

  nextImage(): void {
    if (!this.product?.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.product.images.length;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.fallbackImage;
  }

  loadProduct(id: number): void {
    this.message = '';
    this.loading = true;
    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.product = this.normalizeProduct(product);
        this.currentImageIndex = 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.product = null;
        this.loading = false;
      }
    });
  }

  buyNow(): void {
    if (!this.product) return;

    this.message = '';
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/product/${this.product.id}` } });
      return;
    }

    this.cartService.addProduct(this.product);
    this.message = 'Produit ajouté au panier.';
    this.router.navigate(['/cart']);
  }

  contactSeller(): void {
    if (!this.product?.sellerId) return;
    this.router.navigate(['/seller', this.product.sellerId]);
  }

  getEcoScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 50) return 'moderate';
    return 'low';
  }

  getEcoScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Moderate';
    return 'Low';
  }

  canShowBuyAction(): boolean {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.getCurrentUser()?.role?.toLowerCase();
    return role === 'buyer';
  }

  getCurrencySymbol(currency?: string): string {
    const curr = (currency || 'DT').toUpperCase();
    switch (curr) {
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'DT':
      default:
        return 'DT';
    }
  }

  formatPriceWithCurrency(price: number, currency?: string): string {
    const symbol = this.getCurrencySymbol(currency);
    const curr = (currency || 'DT').toUpperCase();
    
    if (curr === 'USD') {
      return `${symbol}${price.toFixed(2)}`;
    } else if (curr === 'EUR') {
      return `${price.toFixed(2)}${symbol}`;
    } else {
      return `${price.toFixed(2)} ${symbol}`;
    }
  }
}
