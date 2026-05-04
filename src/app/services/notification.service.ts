/**
 * Service d'acces au centre de notifications (Wave 2).
 * Appelle les endpoints REST /api/notifications/* du backend.
 * Toutes les operations sont scoped a l'utilisateur connecte (JWT).
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { NotificationDTO } from '../models/notification';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /** Toutes les notifications de l'utilisateur connecte */
  getMyNotifications(): Observable<NotificationDTO[]> {
    return this.http.get<NotificationDTO[]>(`${this.baseUrl}/me`);
  }

  /** Uniquement les notifications non lues */
  getUnread(): Observable<NotificationDTO[]> {
    return this.http.get<NotificationDTO[]>(`${this.baseUrl}/me/unread`);
  }

  /**
   * Compteur de notifications non lues (pour le badge de la cloche).
   * Le backend retourne { "count": N } — on mappe en Observable<number> via map().
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/me/unread-count`).pipe(
      map(r => r?.count ?? 0)
    );
  }

  /** Marque une notification comme lue */
  markAsRead(id: number): Observable<NotificationDTO> {
    return this.http.put<NotificationDTO>(`${this.baseUrl}/${id}/read`, {});
  }

  /** Marque toutes les notifications non lues comme lues (bulk) */
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/me/read-all`, {});
  }

  /** Supprime une notification (owner uniquement) */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}