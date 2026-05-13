import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotificationCenter } from './notification-center';
import { NotificationService } from '../../services/notification.service';
import { NotificationDTO } from '../../models/notification';

/**
 * Tests unitaires — NotificationCenter (Wave 2).
 * Verifie les onglets, les mutations (mark-read, delete), et la gestion d'erreurs.
 */
describe('NotificationCenter', () => {
  let component: NotificationCenter;
  let fixture: ComponentFixture<NotificationCenter>;

  const now = new Date().toISOString();

  const makeNotif = (id: number, read: boolean): NotificationDTO => ({
    id,
    recipientId: 1,
    type: 'TASK_ASSIGNED',
    title: `Notification ${id}`,
    message: `Message ${id}`,
    read,
    entityType: 'TASK',
    entityId: id * 10,
    createdAt: now,
  });

  const mockService = {
    getMyNotifications: vi.fn().mockReturnValue(of([])),
    markAsRead: vi.fn().mockReturnValue(of({})),
    markAllAsRead: vi.fn().mockReturnValue(of(undefined)),
    delete: vi.fn().mockReturnValue(of(undefined)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockService.getMyNotifications.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [NotificationCenter],
      providers: [provideRouter([]), { provide: NotificationService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Loading & initial state ────────────────────────────────────────────────

  it('should load notifications on init', () => {
    expect(mockService.getMyNotifications).toHaveBeenCalledOnce();
    expect(component.loading).toBe(false);
  });

  it('should set errorMessage on API failure', () => {
    mockService.getMyNotifications.mockReturnValue(throwError(() => ({ status: 500 })));
    const f2 = TestBed.createComponent(NotificationCenter);
    const c2 = f2.componentInstance;
    f2.detectChanges();
    expect(c2.errorMessage).toBeTruthy();
    expect(c2.loading).toBe(false);
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────

  it('should default to "all" tab', () => {
    expect(component.activeTab).toBe('all');
  });

  it('should show all notifications in "all" tab', () => {
    component.notifications = [makeNotif(1, true), makeNotif(2, false)];
    component.activeTab = 'all';
    expect(component.displayed.length).toBe(2);
  });

  it('should show only unread in "unread" tab', () => {
    component.notifications = [makeNotif(1, true), makeNotif(2, false), makeNotif(3, false)];
    component.setTab('unread');
    expect(component.displayed.length).toBe(2);
  });

  it('should count unread correctly', () => {
    component.notifications = [makeNotif(1, true), makeNotif(2, false), makeNotif(3, false)];
    expect(component.unreadCount).toBe(2);
  });

  // ── Mark as read ──────────────────────────────────────────────────────────

  it('should call markAsRead and update notification state', () => {
    const notif = makeNotif(1, false);
    component.notifications = [notif];
    mockService.markAsRead.mockReturnValue(of({}));

    component.markAsRead(notif);

    expect(mockService.markAsRead).toHaveBeenCalledWith(1);
    expect(notif.read).toBe(true);
  });

  it('should NOT call markAsRead if notification is already read', () => {
    const notif = makeNotif(1, true);
    component.markAsRead(notif);
    expect(mockService.markAsRead).not.toHaveBeenCalled();
  });

  // ── Mark all as read ──────────────────────────────────────────────────────

  it('should mark all notifications as read', () => {
    component.notifications = [makeNotif(1, false), makeNotif(2, false)];
    mockService.markAllAsRead.mockReturnValue(of(undefined));

    component.markAllAsRead();

    expect(mockService.markAllAsRead).toHaveBeenCalledOnce();
    expect(component.notifications.every((n) => n.read)).toBe(true);
  });

  it('should NOT call markAllAsRead when all are already read', () => {
    component.notifications = [makeNotif(1, true), makeNotif(2, true)];
    component.markAllAsRead();
    expect(mockService.markAllAsRead).not.toHaveBeenCalled();
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it('should remove notification from list on delete', () => {
    component.notifications = [makeNotif(1, false), makeNotif(2, false)];
    mockService.delete.mockReturnValue(of(undefined));

    component.deleteNotif(component.notifications[0]);

    expect(mockService.delete).toHaveBeenCalledWith(1);
    expect(component.notifications.length).toBe(1);
    expect(component.notifications[0].id).toBe(2);
  });

  // ── Relative time ─────────────────────────────────────────────────────────

  it('formatRelative() should return "just now" for very recent timestamps', () => {
    const recent = new Date(Date.now() - 10_000).toISOString();
    expect(component.formatRelative(recent)).toBe('just now');
  });

  it('formatRelative() should return "Xm ago" for timestamps in the past hour', () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(component.formatRelative(fiveMin)).toBe('5m ago');
  });

  it('formatRelative() should handle empty string gracefully', () => {
    expect(component.formatRelative('')).toBe('');
  });

  // ── Type helpers ──────────────────────────────────────────────────────────

  it('typeIcon() should return "assign" for TASK_ASSIGNED', () => {
    expect(component.typeIcon('TASK_ASSIGNED')).toBe('assign');
  });

  it('typeBadgeClass() should return "type-error" for TASK_OVERDUE', () => {
    expect(component.typeBadgeClass('TASK_OVERDUE')).toBe('type-error');
  });
});
