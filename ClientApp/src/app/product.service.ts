import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from './product.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private base = '/api/products';
  constructor(private http: HttpClient) {}

  getAll(): Promise<Product[]> {
    return firstValueFrom(this.http.get<Product[]>(this.base));
  }

  get(id: number): Promise<Product> {
    return firstValueFrom(this.http.get<Product>(`${this.base}/${id}`));
  }

  create(product: Product): Promise<Product> {
    return firstValueFrom(this.http.post<Product>(this.base, product));
  }

  update(id: number, product: Product): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.base}/${id}`, product));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
