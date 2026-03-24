import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  availableProducts: number;
  totalTransactions: number;
  averageSalesPerProduct: number;
  totalCO2Saved: number;
  averageRecycledPercentage: number;
  productsValidated: number;
  revenueByCurrency: CurrencyAmount[];
}

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  status: 'active' | 'inactive';
  ecoScore: number;
  totalPoints: number;
  productsCount: number;
  purchasesCount: number;
  salesCount: number;
}

export interface AdminProduct {
  id: number;
  title: string;
  sellerName: string;
  sellerId: number;
  price: number;
  currency: string;
  status: string;
  ecoScore: number;
  material: string;
  category: string;
  createdAt: string;
  salesCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`);
  }

  updateUserStatus(userId: number, status: 'active' | 'inactive' | 'banned'): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/users/${userId}/status`, { status });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }

  getProducts(): Observable<AdminProduct[]> {
    return this.http.get<AdminProduct[]>(`${this.apiUrl}/products`);
  }

  validateProduct(productId: string | number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/validate-product/${productId}`, {});
  }

  deleteProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${productId}`);
  }
}
