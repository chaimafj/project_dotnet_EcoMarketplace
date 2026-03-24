import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface UpdateUserRequest {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  bio?: string;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  ecoScore: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUserById(id: number): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: number, payload: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, payload);
  }
}