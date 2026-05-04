import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuditLogList } from './audit-log-list';
import { AuditService } from '../../services/audit.service';
import { AuditLogDTO, PageResponse } from '../../models/audit-log';

/**
 * Tests unitaires — AuditLogList (Wave 2).
 * Verifie les filtres, la pagination cote serveur, les helpers visuels, et les erreurs.
 */
describe('AuditLogList', () => {
  let component: AuditLogList;
  let fixture: ComponentFixture<AuditLogList>;

  const makeEntry = (id: number): AuditLogDTO => ({
    id, actorId: 1, actorEmail: 'admin@biat.com', actorRole: 'ADMIN',
    action: 'CREATE', entityType: 'PROJECT', entityId: 10,
    entityName: 'Project Alpha', details: 'Project created',
    projectId: 10, projectName: 'Project Alpha',
    timestamp: '2026-04-14T10:00:00',
  });

  const makePage = (entries: AuditLogDTO[], total = 50): PageResponse<AuditLogDTO> => ({
    content: entries, totalElements: total, totalPages: Math.ceil(total / 20),
    number: 0, size: 20, first: true, last: false,
  });

  const mockAuditService = {
    search: vi.fn().mockReturnValue(of(makePage([makeEntry(1)]))),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuditService.search.mockReturnValue(of(makePage([makeEntry(1)])));

    await TestBed.configureTestingModule({
      imports: [AuditLogList],
      providers: [
        provideRouter([]),
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Initial load ──────────────────────────────────────────────────────────

  it('should call search on init and populate entries', () => {
    expect(mockAuditService.search).toHaveBeenCalledOnce();
    expect(component.entries.length).toBe(1);
    expect(component.loading).toBe(false);
  });

  it('should store totalElements from page response', () => {
    expect(component.totalElements).toBe(50);
  });

  it('should set errorMessage when service fails', () => {
    mockAuditService.search.mockReturnValue(throwError(() => ({ status: 403 })));
    component.load();
    expect(component.errorMessage).toContain('403');
    expect(component.loading).toBe(false);
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  it('applyFilters() should reset to page 1 before loading', () => {
    component.currentPage = 5;
    component.applyFilters();
    expect(component.currentPage).toBe(1);
    expect(mockAuditService.search).toHaveBeenCalledTimes(2); // init + applyFilters
  });

  it('applyFilters() should pass entityType filter to service', () => {
    component.filterEntityType = 'PROJECT';
    component.applyFilters();
    const lastCall = mockAuditService.search.mock.calls.at(-1)?.[0];
    expect(lastCall?.entityType).toBe('PROJECT');
  });

  it('applyFilters() should pass action filter to service', () => {
    component.filterAction = 'DELETE';
    component.applyFilters();
    const lastCall = mockAuditService.search.mock.calls.at(-1)?.[0];
    expect(lastCall?.action).toBe('DELETE');
  });

  it('resetFilters() should clear all filters and reload', () => {
    component.filterEntityType = 'TASK';
    component.filterAction = 'UPDATE';
    component.filterFrom = '2026-01-01';
    component.filterTo = '2026-04-01';
    component.resetFilters();
    expect(component.filterEntityType).toBe('');
    expect(component.filterAction).toBe('');
    expect(component.filterFrom).toBe('');
    expect(component.filterTo).toBe('');
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  it('onPageChange() should update currentPage and reload', () => {
    component.onPageChange(3);
    expect(component.currentPage).toBe(3);
    // init + onPageChange
    expect(mockAuditService.search).toHaveBeenCalledTimes(2);
    const lastCall = mockAuditService.search.mock.calls.at(-1)?.[0];
    // Spring uses 0-based pages
    expect(lastCall?.page).toBe(2);
  });

  // ── Visual helpers ────────────────────────────────────────────────────────

  it('actionBadgeClass() should return badge-success for CREATE', () => {
    expect(component.actionBadgeClass('CREATE')).toBe('badge-success');
  });

  it('actionBadgeClass() should return badge-error for DELETE', () => {
    expect(component.actionBadgeClass('DELETE')).toBe('badge-error');
  });

  it('actionBadgeClass() should return badge-info for UPDATE', () => {
    expect(component.actionBadgeClass('UPDATE')).toBe('badge-info');
  });

  it('actionBadgeClass() should return badge-warning for STATUS_CHANGE', () => {
    expect(component.actionBadgeClass('STATUS_CHANGE')).toBe('badge-warning');
  });

  it('actionLabel() should return human-readable label', () => {
    expect(component.actionLabel('CREATE')).toBe('Create');
    expect(component.actionLabel('STATUS_CHANGE')).toBe('Status Change');
    expect(component.actionLabel('DEPENDENCY_REMOVE')).toBe('Dep Remove');
  });

  it('formatTs() should handle empty string', () => {
    expect(component.formatTs('')).toBe('—');
  });

  it('formatTs() should format valid ISO timestamp', () => {
    const result = component.formatTs('2026-04-14T10:30:00');
    // Result should be a non-empty string representation
    expect(result.length).toBeGreaterThan(5);
    expect(result).not.toBe('—');
  });

  // ── Audit Detail View (Wave 3) ────────────────────────────────────────────

  it('toggleDetail() should set expandedId on first click', () => {
    const entry = makeEntry(1);
    component.toggleDetail(entry);
    expect(component.expandedId).toBe(1);
  });

  it('toggleDetail() should clear expandedId on second click (toggle off)', () => {
    const entry = makeEntry(1);
    component.toggleDetail(entry);
    component.toggleDetail(entry);
    expect(component.expandedId).toBeNull();
  });

  it('toggleDetail() should switch to new entry (close previous, open new)', () => {
    const e1 = makeEntry(1);
    const e2 = makeEntry(2);
    component.toggleDetail(e1);
    expect(component.expandedId).toBe(1);
    component.toggleDetail(e2);
    expect(component.expandedId).toBe(2);
  });

  it('expandedId should start as null', () => {
    expect(component.expandedId).toBeNull();
  });
});