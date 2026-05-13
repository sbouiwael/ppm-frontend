/**
 * Composant centre de notifications (Wave 2).
 * Affiche la boite de reception des notifications de l'utilisateur connecte.
 * Fonctionnalites : filtrage lu/non-lu, mark as read, mark all as read, delete.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { NotificationDTO, NotificationType } from '../../models/notification';

type FilterTab = 'all' | 'unread';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.css',
})
export class NotificationCenter implements OnInit, OnDestroy {
  notifications: NotificationDTO[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  activeTab: FilterTab = 'all';
  private destroy$ = new Subject<void>();

  constructor(
    private notifService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.notifService
      .getMyNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.notifications = data ?? [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = `Error ${err.status} — failed to load notifications.`;
          this.cdr.detectChanges();
        },
      });
  }

  get displayed(): NotificationDTO[] {
    if (this.activeTab === 'unread') {
      return this.notifications.filter((n) => !n.read);
    }
    return this.notifications;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  setTab(tab: FilterTab): void {
    this.activeTab = tab;
  }

  markAsRead(notif: NotificationDTO): void {
    if (notif.read) return;
    this.notifService
      .markAsRead(notif.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notif.read = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to mark notification as read.';
          this.cdr.detectChanges();
        },
      });
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0) return;
    this.notifService
      .markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.forEach((n) => (n.read = true));
          this.showSuccess('All notifications marked as read.');
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to mark all as read.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteNotif(notif: NotificationDTO): void {
    this.notifService
      .delete(notif.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter((n) => n.id !== notif.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to delete notification.';
          this.cdr.detectChanges();
        },
      });
  }

  /** Icone SVG selon le type de notification */
  typeIcon(type: NotificationType): string {
    switch (type) {
      case 'TASK_ASSIGNED':
        return 'assign';
      case 'DEADLINE_APPROACHING':
        return 'clock';
      case 'TASK_OVERDUE':
        return 'alert';
      case 'OVERLOAD_WARNING':
        return 'alert';
      case 'PROJECT_UPDATE':
        return 'folder';
      case 'DEPENDENCY_BLOCKED':
        return 'block';
      default:
        return 'bell';
    }
  }

  /** Classe CSS du chip de type */
  typeBadgeClass(type: NotificationType): string {
    switch (type) {
      case 'TASK_ASSIGNED':
        return 'type-assigned';
      case 'DEADLINE_APPROACHING':
        return 'type-warning';
      case 'TASK_OVERDUE':
        return 'type-error';
      case 'OVERLOAD_WARNING':
        return 'type-warning';
      case 'PROJECT_UPDATE':
        return 'type-info';
      case 'DEPENDENCY_BLOCKED':
        return 'type-error';
      default:
        return 'type-info';
    }
  }

  /** Libelle lisible du type */
  typeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      TASK_ASSIGNED: 'Assignment',
      DEADLINE_APPROACHING: 'Deadline',
      TASK_OVERDUE: 'Overdue',
      OVERLOAD_WARNING: 'Overload',
      PROJECT_UPDATE: 'Project',
      DEPENDENCY_BLOCKED: 'Blocked',
    };
    return labels[type] ?? type;
  }

  /** Formate un timestamp ISO en temps relatif ou date */
  formatRelative(ts: string): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }
}
