import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

/**
 * Tests unitaires — NotificationService (Wave 2).
 * Verifie les URLs, la transformation { count } -> number, et les requetes HTTP.
 */
describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getMyNotifications() should GET /me', () => {
    service.getMyNotifications().subscribe();
    const req = httpMock.expectOne(`${base}/me`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getUnread() should GET /me/unread', () => {
    service.getUnread().subscribe();
    const req = httpMock.expectOne(`${base}/me/unread`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getUnreadCount() should map { count } response to number', () => {
    let result = -1;
    service.getUnreadCount().subscribe(n => (result = n));
    const req = httpMock.expectOne(`${base}/me/unread-count`);
    req.flush({ count: 7 });
    expect(result).toBe(7);
  });

  it('getUnreadCount() should return 0 when count is missing', () => {
    let result = -1;
    service.getUnreadCount().subscribe(n => (result = n));
    const req = httpMock.expectOne(`${base}/me/unread-count`);
    req.flush({});
    expect(result).toBe(0);
  });

  it('markAsRead() should PUT /{id}/read', () => {
    service.markAsRead(42).subscribe();
    const req = httpMock.expectOne(`${base}/42/read`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('markAllAsRead() should PUT /me/read-all', () => {
    service.markAllAsRead().subscribe();
    const req = httpMock.expectOne(`${base}/me/read-all`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('delete() should DELETE /{id}', () => {
    service.delete(99).subscribe();
    const req = httpMock.expectOne(`${base}/99`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});