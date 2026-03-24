import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../environments/environment';

export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  ecoScore: number;
  totalPoints: number;
  profilePictureUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private jwtHelper = new JwtHelperService();
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.loadStoredUser();
  }

  login(request: LoginRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, request)
      .pipe(
        map((response: any) => {
          const mappedUser = this.mapAuthResponseToUser(response);
          const token = response?.token ?? response?.Token;

          if (token && mappedUser && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(mappedUser));
            this.currentUserSubject.next(mappedUser);
          }
          return response;
        })
      );
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, request);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (token == null) return false;

    // Ensure in-memory user state is restored after refresh/hydration.
    if (!this.currentUserSubject.value) {
      const stored = this.readStoredUser();
      if (stored) {
        this.currentUserSubject.next(stored);
      }
    }

    // In development backend we use a non-JWT placeholder token.
    if (token.startsWith('fake-jwt-token-')) return true;

    try {
      return !this.jwtHelper.isTokenExpired(token);
    } catch {
      return true;
    }
  }

  getCurrentUser(): User | null {
    if (!this.currentUserSubject.value) {
      const stored = this.readStoredUser();
      if (stored) {
        this.currentUserSubject.next(stored);
      }
    }

    return this.currentUserSubject.value;
  }

  updateCurrentUser(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    this.currentUserSubject.next(user);
  }

  private loadStoredUser(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const user = this.readStoredUser();
    if (user) {
      this.currentUserSubject.next(user);
      return;
    }

    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  private readStoredUser(): User | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr) as User;
      if (user && typeof user.id === 'number' && !!user.email) {
        return user;
      }
    } catch {
      return null;
    }

    return null;
  }

  private mapAuthResponseToUser(response: any): User | null {
    const source = response?.user ?? response?.User ?? response;
    const id = source?.id ?? source?.Id;
    const email = source?.email ?? source?.Email;

    if (id == null || email == null) return null;

    return {
      id: Number(id),
      email: String(email),
      username: String(source?.username ?? source?.Username ?? ''),
      firstName: String(source?.firstName ?? source?.FirstName ?? ''),
      lastName: String(source?.lastName ?? source?.LastName ?? ''),
      role: String(source?.role ?? source?.Role ?? 'Buyer'),
      ecoScore: Number(source?.ecoScore ?? source?.EcoScore ?? 0),
      totalPoints: Number(source?.totalPoints ?? source?.TotalPoints ?? 0),
      profilePictureUrl: source?.profilePictureUrl ?? source?.ProfilePictureUrl,
    };
  }
}
