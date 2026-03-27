import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Product {
  id: string | number;
  title: string;
  description: string;
  price: number;
  currency?: string;
  condition: string;
  category: string;
  sellerId: string | number;
  sellerName: string;
  image?: string;
  images?: string[];
  location?: string;
  ecoScore: number;
  material: string;
  isRecycled?: boolean;
  isSustainable?: boolean;
  carbonFootprint?: number;
  co2Saved?: number;
  recycledPercentage?: number;
  createdAt?: Date;
}

export interface ProductFilter {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  minEcoScore?: number;
  maxPrice?: number;
  sellerId?: number;
}

export interface CreateProductRequest {
  sellerId?: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  category: string;
  images: string[];
  location: string;
  latitude: number;
  longitude: number;
  material: string;
  isRecycled?: boolean;
  isSustainable?: boolean;
  carbonFootprint?: number;
  recycledPercentage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  getProducts(filter: ProductFilter = {}): Observable<any> {
    let params = new HttpParams();

    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    if (filter.category) params = params.set('category', filter.category);
    if (filter.search) params = params.set('search', filter.search);
    if (filter.minEcoScore) params = params.set('minEcoScore', filter.minEcoScore.toString());
    if (filter.maxPrice) params = params.set('maxPrice', filter.maxPrice.toString());
    if (filter.sellerId) params = params.set('sellerId', filter.sellerId.toString());

    return this.http.get(this.apiUrl, { params });
  }

  getProduct(id: string | number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: string | number, product: CreateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getProductsBySeller(sellerId: number, page: number = 1, pageSize: number = 12): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sellerId', sellerId.toString());
    
    return this.http.get(this.apiUrl, { params });
  }

  getRecommendations(userId: number, count: number = 10): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/recommendations`, {
      params: {
        userId: userId.toString(),
        count: count.toString()
      }
    });
  }

  scanProduct(image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post(`${this.apiUrl}/scan`, formData);
  }
}
