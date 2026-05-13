import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AuditService } from './audit.service';
import { environment } from '../../environments/environment';

/**
 * Tests unitaires — AuditService (Wave 2).
 * Verifie la construction des HttpParams et les methodes de lecture.
 */
describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/audit`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('search() with no params should GET /audit with no query params', () => {
    service.search({}).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('search() should append entityType param when provided', () => {
    service.search({ entityType: 'PROJECT' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.params.get('entityType')).toBe('PROJECT');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('search() should append action param when provided', () => {
    service.search({ action: 'DELETE' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.params.get('action')).toBe('DELETE');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('search() should convert date-only from to ISO datetime', () => {
    service.search({ from: '2026-01-01', to: '2026-04-14' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.params.get('from')).toBe('2026-01-01T00:00:00');
    expect(req.request.params.get('to')).toBe('2026-04-14T23:59:59');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('search() should send page as 0-based index', () => {
    service.search({ page: 2 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('getByEntity() should GET /entity/{type}/{id}', () => {
    service.getByEntity('TASK', 42).subscribe();
    const req = httpMock.expectOne(`${base}/entity/TASK/42`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getByProject() should GET /project/{id}', () => {
    service.getByProject(10).subscribe();
    const req = httpMock.expectOne(`${base}/project/10`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getByActor() should GET /actor/{id}', () => {
    service.getByActor(5).subscribe();
    const req = httpMock.expectOne(`${base}/actor/5`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
