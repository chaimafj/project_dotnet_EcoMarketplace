import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './product.service';
import { Product } from './product.model';

@Component({
  selector: 'product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Create product</h2>
      <input [(ngModel)]="name" placeholder="Name" />
      <input [(ngModel)]="category" placeholder="Category" />
      <input [(ngModel)]="price" placeholder="Price" type="number" />
      <textarea [(ngModel)]="description" placeholder="Description"></textarea>
      <button (click)="create()">Create</button>
    </div>
  `
})
export class ProductFormComponent {
  @Output() created = new EventEmitter<void>();
  name = '';
  category = '';
  price = 0;
  description = '';

  constructor(private svc: ProductService) {}

  async create() {
    const p: Product = { name: this.name, category: this.category, price: this.price, description: this.description };
    await this.svc.create(p);
    this.name = '';
    this.category = '';
    this.price = 0;
    this.description = '';
    this.created.emit();
  }
}
