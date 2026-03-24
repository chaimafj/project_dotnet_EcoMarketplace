import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { ProductService, Product } from '../../Services/product.service';
import { UserService, UserProfileResponse } from '../../Services/user.service';

interface SellerInfo {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string;
  ecoScore: number;
}

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbPagination],
  templateUrl: './seller-products.component.html',
  styleUrls: ['./seller-products.component.scss']
})
export class SellerProductsComponent implements OnInit {
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';
  sellerId: number = 0;
  seller: SellerInfo | null = null;
  products: Product[] = [];
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;
  totalCount = 0;
  loading = false;
  error = '';

  constructor(
    private productService: ProductService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.sellerId = +params['id'];
      if (this.sellerId) {
        this.loadSellerInfo();
        this.loadSellerProducts();
      } else {
        this.error = 'Vendeur invalide';
      }
    });
  }

  loadSellerInfo(): void {
    this.userService.getUserById(this.sellerId).subscribe({
      next: (user: UserProfileResponse) => {
        const parsedName = (user.displayName || '').trim().split(/\s+/).filter(Boolean);
        const firstName = user.firstName || parsedName[0] || 'Vendeur';
        const lastName = user.lastName || parsedName.slice(1).join(' ');

        this.seller = {
          id: user.id,
          username: user.username || user.displayName || `seller-${user.id}`,
          firstName,
          lastName,
          email: user.email,
          profilePictureUrl: user.profilePictureUrl,
          ecoScore: Number(user.ecoScore ?? 0)
        };
      },
      error: () => {
        this.error = 'Vendeur non trouvé';
      }
    });
  }

  loadSellerProducts(): void {
    this.loading = true;
    this.productService.getProductsBySeller(this.sellerId, this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        const items = Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.Items)
            ? response.Items
            : [];
        this.products = items.map((product: Product) => this.normalizeProduct(product));
        this.totalCount = Number(response?.totalCount ?? this.products.length);
        this.totalPages = Number(response?.totalPages ?? 1);
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les produits du vendeur';
        this.loading = false;
      }
    });
  }

  private normalizeProduct(product: Product): Product {
    const image = (product as any)?.image ?? (product as any)?.Image;
    const images = Array.isArray((product as any)?.images)
      ? (product as any).images
      : Array.isArray((product as any)?.Images)
        ? (product as any).Images
        : [];

    return {
      ...product,
      id: (product as any)?.id ?? (product as any)?.Id ?? '',
      sellerId: (product as any)?.sellerId ?? (product as any)?.SellerId ?? this.sellerId,
      sellerName: (product as any)?.sellerName ?? (product as any)?.SellerName ?? this.getSellerFullName(),
      image: image || images[0] || this.fallbackImage,
      images: images.length ? images : [this.fallbackImage],
      title: (product as any)?.title ?? (product as any)?.Title ?? 'Produit sans titre',
      description: (product as any)?.description ?? (product as any)?.Description ?? 'Aucune description disponible.',
      location: (product as any)?.location ?? (product as any)?.Location ?? 'Non précisée',
      category: (product as any)?.category ?? (product as any)?.Category ?? 'Other',
      condition: (product as any)?.condition ?? (product as any)?.Condition ?? 'Good',
      ecoScore: Number((product as any)?.ecoScore ?? (product as any)?.EcoScore ?? 0),
      price: Number((product as any)?.price ?? (product as any)?.Price ?? 0),
      currency: (product as any)?.currency ?? (product as any)?.Currency ?? 'DT'
    };
  }

  onProductImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.fallbackImage;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadSellerProducts();
  }

  getSellerFullName(): string {
    if (!this.seller) return '';
    return `${this.seller.firstName} ${this.seller.lastName}`;
  }

  get averageEcoScore(): number {
    if (!this.products.length) return 0;
    const total = this.products.reduce((sum, product) => sum + Number(product.ecoScore || 0), 0);
    return Math.round(total / this.products.length);
  }

  get portfolioValue(): number {
    return this.products.reduce((sum, product) => sum + Number(product.price || 0), 0);
  }

  get topCategory(): string {
    if (!this.products.length) return 'N/A';

    const counts = new Map<string, number>();
    this.products.forEach((product) => {
      const category = (product.category || 'Other').trim();
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  get sellerInitials(): string {
    if (!this.seller) return 'V';
    const first = (this.seller.firstName || '').trim().charAt(0);
    const last = (this.seller.lastName || '').trim().charAt(0);
    return `${first}${last}`.toUpperCase() || 'V';
  }

  goBack(): void {
    this.router.navigate(['/products']);
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
