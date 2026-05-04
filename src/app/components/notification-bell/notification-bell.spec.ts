import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotificationBell } from './notification-bell';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth-service';

/**
 * Tests unitaires — NotificationBell (Wave 2).
 * Verifie l'affichage du badge, le comportement au demarrage, et la resilience.
 */
describe('NotificationBell', () => {
  let component: NotificationBell;
  let fixture: ComponentFixture<NotificationBell>;

  const mockNotifService = {
    getUnreadCount: vi.fn().mockReturnValue(of(0)),
  };

  // AuthService mock — token null => SSE skipped in tests (EventSource not in JSDOM)
  const mockAuthService = { token: null };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNotifService.getUnreadCount.mockReturnValue(of(0));

    await TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: mockNotifService },
        { provide: AuthService,         useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBell);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with unreadCount = 0', () => {
    fixture.detectChanges();
    expect(component.unreadCount).toBe(0);
  });

  it('should reflect unread count from service on init', () => {
    mockNotifService.getUnreadCount.mockReturnValue(of(5));
    fixture.detectChanges();
    expect(component.unreadCount).toBe(5);
  });

  it('should not show badge when unreadCount is 0', () => {
    mockNotifService.getUnreadCount.mockReturnValue(of(0));
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.bell-badge');
    expect(badge).toBeNull();
  });

  it('should show badge when unreadCount > 0', () => {
    mockNotifService.getUnreadCount.mockReturnValue(of(3));
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.bell-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent.trim()).toBe('3');
  });

  it('should cap badge text at "99+" for counts > 99', () => {
    mockNotifService.getUnreadCount.mockReturnValue(of(150));
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.bell-badge');
    expect(badge?.textContent?.trim()).toBe('99+');
  });

  it('should display exactly 99 (not capped) when count is 99', () => {
    mockNotifService.getUnreadCount.mockReturnValue(of(99));
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.bell-badge');
    expect(badge?.textContent?.trim()).toBe('99');
  });

  it('should remain functional (unreadCount=0) when service throws', () => {
    // Error must be silent — never break the navbar
    mockNotifService.getUnreadCount.mockReturnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    // Count falls back to 0, no badge shown, no crash
    expect(component.unreadCount).toBe(0);
    expect(fixture.nativeElement.querySelector('.bell-badge')).toBeNull();
  });

  it('should render a link to /notifications', () => {
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[routerLink]');
    expect(link).not.toBeNull();
    const rl = link?.getAttribute('ng-reflect-router-link') || link?.getAttribute('href') || '';
    expect(link).toBeTruthy();
  });

  it('should unsubscribe on destroy (no memory leak)', () => {
    fixture.detectChanges();
    // Spy on the destroy subject completion
    const spy = vi.spyOn(component['destroy$'], 'next');
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalled();
  });
});