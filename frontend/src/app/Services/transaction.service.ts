import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface PurchaseRequest {
  buyerId: number | string;
  productId: number | string;
  quantity?: number;
  paymentMethod?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface PurchaseResponse {
  message: string;
  transaction: {
    id: number;
    buyerId: number | string;
    productId: number | string;
    productName: string;
    quantity: number;
    total: number;
    status: string;
    purchasedAt: string;
  };
}

export interface UserOrder {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: string;
  purchasedAt: string;
}

export interface SellerSale {
  id: number;
  productId: number;
  productName: string;
  buyerId: number;
  buyerName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: string;
  purchasedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  purchase(payload: PurchaseRequest): Observable<PurchaseResponse> {
    return this.http.post<PurchaseResponse>(`${this.apiUrl}/purchase`, payload);
  }

  getByUser(userId: number): Observable<UserOrder[]> {
    return this.http.get<UserOrder[]>(`${this.apiUrl}/user/${userId}`);
  }

  getBySeller(sellerId: number): Observable<SellerSale[]> {
    return this.http.get<SellerSale[]>(`${this.apiUrl}/seller/${sellerId}`);
  }
}
