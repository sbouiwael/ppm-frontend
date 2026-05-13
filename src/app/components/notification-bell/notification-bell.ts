/**
 * Composant cloche de notifications (Wave 2 + Wave 3 SSE).
 *
 * STRATEGIE : SSE en premier, polling en fallback.
 * 1. Tente d'ouvrir une connexion SSE via EventSource.
 * 2. Si le navigateur ou le serveur ne supporte pas SSE, replie sur du polling toutes les 30s.
 *
 * SSE TOKEN : EventSource ne supporte pas les headers custom.
 *   Le JWT est passe via ?token= dans l'URL (accepte par JwtAuthenticationFilter).
 *
 * NETTOYAGE : les deux mecanismes (SSE + polling) sont fermes proprement dans ngOnDestroy.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, interval, switchMap, takeUntil } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth-service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit, OnDestroy {
  /** Nombre de notifications non lues (affiché dans le badge) */
  unreadCount = 0;

  private destroy$ = new Subject<void>();
  private eventSource: EventSource | null = null;
  private sseConnected = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Charge le compteur initial immédiatement
    this.fetchCount();
    // Tente SSE en premier
    this.connectSse();
    // Lance le polling — il s'arrêtera si SSE est actif
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeSse();
  }

  // ── SSE ──────────────────────────────────────────────────────────────────

  private connectSse(): void {
    const token = this.authService.token;
    if (!token || typeof EventSource === 'undefined') return;

    const url = `${environment.apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('notification', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          // Le payload contient le nouveau total depuis le backend
          if (typeof data.count === 'number') {
            this.unreadCount = data.count;
          } else {
            this.unreadCount++;
          }
          this.sseConnected = true;
        } catch {
          // payload non JSON — incrémente quand même
          this.unreadCount++;
        }
        this.cdr.detectChanges();
      });

      this.eventSource.onopen = () => {
        this.sseConnected = true;
      };

      this.eventSource.onerror = () => {
        // SSE en erreur — le polling prend le relais automatiquement
        this.sseConnected = false;
        this.closeSse();
      };
    } catch {
      // EventSource non supporté — polling actif
    }
  }

  private closeSse(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sseConnected = false;
  }

  // ── Polling fallback ──────────────────────────────────────────────────────

  private startPolling(): void {
    // No startWith(0) — fetchCount() already handles the initial load on ngOnInit.
    // Polling fires every 30s as a fallback when SSE is not connected.
    interval(30_000)
      .pipe(
        switchMap(() => this.notificationService.getUnreadCount()),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (count) => {
          // Ne remplace le badge que si SSE n'est pas actif
          // (évite un flash de la valeur précédente entre deux events SSE)
          if (!this.sseConnected) {
            this.unreadCount = count ?? 0;
            this.cdr.detectChanges();
          }
        },
        error: () => {}, // silencieux — ne doit pas casser la navbar
      });
  }

  private fetchCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount = count ?? 0;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }
}
