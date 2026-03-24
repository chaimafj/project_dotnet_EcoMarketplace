import { Injectable } from '@angular/core';
import { Product } from './product.service';

export interface CartItem {
  productId: number;
  title: string;
  price: number;
  sellerId: number;
  sellerName: string;
  image: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly storageKey = 'eco-cart';

  getItems(): CartItem[] {
    if (typeof window === 'undefined') return [];

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getCount(): number {
    return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
  }

  remove(productId: number): void {
    const next = this.getItems().filter(item => item.productId !== productId);
    this.save(next);
  }

  updateQuantity(productId: number, quantity: number): void {
    const items = this.getItems();
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    item.quantity = Math.max(1, quantity);
    this.save(items);
  }

  addProduct(product: Product): void {
    const items = this.getItems();
    const productId = Number(product.id);
    const existing = items.find(item => item.productId === productId);

    if (existing) {
      existing.quantity += 1;
      this.save(items);
      return;
    }

    items.push({
      productId,
      title: product.title,
      price: Number(product.price),
      sellerId: Number(product.sellerId),
      sellerName: product.sellerName,
      image: product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
      quantity: 1
    });

    this.save(items);
  }

  private save(items: CartItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }
}
