import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from './product.service';
import { Product } from './product.model';

@Component({
  selector: 'product-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <h2>Products</h2>
      <div *ngIf="loading">Loading...</div>
      <table *ngIf="!loading && products.length>0">
        <thead>
          <tr><th>Id</th><th>Name</th><th>Category</th><th>Price</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of products">
            <td>{{p.id}}</td>
            <td>{{p.name}}</td>
            <td>{{p.category}}</td>
            <td>{{p.price}}</td>
            <td>
              <button (click)="edit(p)">Edit</button>
              <button (click)="remove(p)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!loading && products.length===0">No products</div>
    </div>
  `
})
export class ProductListComponent {
  products: Product[] = [];
  loading = false;

  constructor(private svc: ProductService) {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      this.products = await this.svc.getAll();
    } finally {
      this.loading = false;
    }
  }

  edit(p: Product) {
    const name = prompt('Name', p.name);
    if (name === null) return;
    const category = prompt('Category', p.category ?? '');
    const priceStr = prompt('Price', String(p.price));
    const price = parseFloat(priceStr ?? '0');
    const updated: Product = { ...p, name: name ?? p.name, category: category ?? p.category, price };
    this.svc.update(p.id!, updated).then(() => this.load());
  }

  remove(p: Product) {
    if (!confirm('Delete product?')) return;
    this.svc.delete(p.id!).then(() => this.load());
  }
}
