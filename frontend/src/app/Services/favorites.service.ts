import { Injectable } from '@angular/core';
import { Product } from './product.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  constructor(private authService: AuthService) {}

  getFavorites(): Product[] {
    const key = this.getStorageKey();
    if (!key) return [];

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as Product[];
    } catch {
      return [];
    }
  }

  isFavorite(productId: string | number): boolean {
    const id = String(productId);
    return this.getFavorites().some((p) => String(p.id) === id);
  }

  toggleFavorite(product: Product): boolean {
    const favorites = this.getFavorites();
    const id = String(product.id);
    const exists = favorites.some((p) => String(p.id) === id);

    if (exists) {
      const updated = favorites.filter((p) => String(p.id) !== id);
      this.saveFavorites(updated);
      return false;
    }

    const updated = [this.normalizeFavoriteProduct(product), ...favorites].slice(0, 40);
    this.saveFavorites(updated);
    return true;
  }

  removeFavorite(productId: string | number): void {
    const id = String(productId);
    const updated = this.getFavorites().filter((p) => String(p.id) !== id);
    this.saveFavorites(updated);
  }

  private saveFavorites(products: Product[]): void {
    const key = this.getStorageKey();
    if (!key) return;

    localStorage.setItem(key, JSON.stringify(products));
  }

  private getStorageKey(): string | null {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) return null;
    return `eco-favorites-${currentUser.id}`;
  }

  private normalizeFavoriteProduct(product: Product): Product {
    const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';

    return {
      ...product,
      id: (product as any)?.id ?? (product as any)?.Id,
      sellerId: (product as any)?.sellerId ?? (product as any)?.SellerId,
      sellerName: (product as any)?.sellerName ?? (product as any)?.SellerName ?? 'Vendeur inconnu',
      image: (product as any)?.image ?? (product as any)?.Image ?? fallbackImage,
      images: Array.isArray((product as any)?.images)
        ? (product as any).images
        : Array.isArray((product as any)?.Images)
          ? (product as any).Images
          : [(product as any)?.image ?? fallbackImage],
      title: (product as any)?.title ?? (product as any)?.Title ?? 'Produit',
      description: (product as any)?.description ?? (product as any)?.Description ?? '',
      price: Number((product as any)?.price ?? (product as any)?.Price ?? 0),
      ecoScore: Number((product as any)?.ecoScore ?? (product as any)?.EcoScore ?? 0),
      currency: (product as any)?.currency ?? (product as any)?.Currency ?? 'DT',
      location: (product as any)?.location ?? (product as any)?.Location ?? 'Non précisée',
      category: (product as any)?.category ?? (product as any)?.Category ?? 'Other',
      condition: (product as any)?.condition ?? (product as any)?.Condition ?? 'Good',
      material: (product as any)?.material ?? (product as any)?.Material ?? 'N/A',
    };
  }
}
