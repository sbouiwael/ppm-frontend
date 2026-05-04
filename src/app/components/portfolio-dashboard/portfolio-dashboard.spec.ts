import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PortfolioDashboard } from './portfolio-dashboard';
import { DashboardService } from '../../services/dashboard-service';
import { PortfolioDashboardDTO } from '../../models/portfolio-dashboard';

/**
 * Tests unitaires — PortfolioDashboard (Wave 2).
 * Verifie les KPIs, le filtrage de la table de sante, et les helpers visuels.
 * Note : Chart.js est mocke — les graphiques ne sont pas renders en JSDOM.
 */
describe('PortfolioDashboard', () => {
  let component: PortfolioDashboard;
  let fixture: ComponentFixture<PortfolioDashboard>;

  const sampleData: PortfolioDashboardDTO = {
    totalPortfolios: 3,
    totalActiveProjects: 10,
    delayedProjectsCount: 2,
    completedProjectsCount: 3,
    onTrackProjectsCount: 4,
    atRiskProjectsCount: 1,
    averageProgress: 58.5,
    totalActiveTasks: 45,
    overdueTasks: 5,
    tasksByStatus: { NOT_STARTED: 10, IN_PROGRESS: 20, DONE: 12, BLOCKED: 3 },
    totalActiveUsers: 15,
    usersByRole: { DEV: 8, PM: 3, PMO: 2, ADMIN: 1, QA: 1 },
    projectHealthOverview: [
      {
        id: 1, name: 'Core Banking',  progress: 20, startDate: '2026-01-01',
        endDate: '2026-03-01', baselineEndDate: null,
        isActive: true, healthStatus: 'DELAYED',
        managerId: 10, portfolioId: 1, portfolioName: 'Digital', taskCount: 12,
      },
      {
        id: 2, name: 'Mobile App',    progress: 60, startDate: '2026-02-01',
        endDate: '2026-06-01', baselineEndDate: null,
        isActive: true, healthStatus: 'ON_TRACK',
        managerId: 11, portfolioId: 1, portfolioName: 'Digital', taskCount: 8,
      },
      {
        id: 3, name: 'Data Warehouse', progress: 100, startDate: '2025-01-01',
        endDate: '2025-12-31', baselineEndDate: null,
        isActive: false, healthStatus: 'COMPLETED',
        managerId: 10, portfolioId: 2, portfolioName: 'Analytics', taskCount: 5,
      },
    ],
    portfolioSummaries: [
      {
        id: 1, name: 'Digital',    projectCount: 5, activeProjectCount: 4,
        delayedProjectCount: 1, completedProjectCount: 1, avgProgress: 52,
      },
    ],
  };

  const mockDashboardService = {
    getPortfolioDashboard: vi.fn().mockReturnValue(of(sampleData)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDashboardService.getPortfolioDashboard.mockReturnValue(of(sampleData));

    await TestBed.configureTestingModule({
      imports: [PortfolioDashboard],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  it('should load portfolio dashboard on init', () => {
    expect(mockDashboardService.getPortfolioDashboard).toHaveBeenCalledOnce();
    expect(component.data).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should set errorMessage on service failure', () => {
    mockDashboardService.getPortfolioDashboard.mockReturnValue(
      throwError(() => ({ status: 403 }))
    );
    const f2 = TestBed.createComponent(PortfolioDashboard);
    const c2 = f2.componentInstance;
    f2.detectChanges();
    expect(c2.errorMessage).toBeTruthy();
    expect(c2.loading).toBe(false);
  });

  // ── KPI data ──────────────────────────────────────────────────────────────

  it('should expose data KPIs correctly', () => {
    expect(component.data?.totalActiveProjects).toBe(10);
    expect(component.data?.delayedProjectsCount).toBe(2);
    expect(component.data?.overdueTasks).toBe(5);
    expect(component.data?.averageProgress).toBe(58.5);
  });

  // ── Health table filtering ─────────────────────────────────────────────────

  it('filteredProjects should return all projects when no filter', () => {
    component.healthFilter = '';
    component.searchTerm = '';
    expect(component.filteredProjects.length).toBe(3);
  });

  it('filteredProjects should filter by DELAYED health status', () => {
    component.healthFilter = 'DELAYED';
    expect(component.filteredProjects.length).toBe(1);
    expect(component.filteredProjects[0].name).toBe('Core Banking');
  });

  it('filteredProjects should filter by COMPLETED health status', () => {
    component.healthFilter = 'COMPLETED';
    expect(component.filteredProjects.length).toBe(1);
    expect(component.filteredProjects[0].name).toBe('Data Warehouse');
  });

  it('filteredProjects should filter by searchTerm on name', () => {
    component.healthFilter = '';
    component.searchTerm = 'mobile';
    expect(component.filteredProjects.length).toBe(1);
    expect(component.filteredProjects[0].name).toBe('Mobile App');
  });

  it('filteredProjects should filter by searchTerm on portfolioName', () => {
    component.searchTerm = 'analytics';
    expect(component.filteredProjects.length).toBe(1);
    expect(component.filteredProjects[0].portfolioName).toBe('Analytics');
  });

  it('filteredProjects combines healthFilter AND searchTerm', () => {
    component.healthFilter = 'ON_TRACK';
    component.searchTerm = 'core'; // no ON_TRACK project named "core"
    expect(component.filteredProjects.length).toBe(0);
  });

  // ── Health badge helpers ──────────────────────────────────────────────────

  it('healthClass() maps correctly', () => {
    expect(component.healthClass('ON_TRACK')).toBe('health-on-track');
    expect(component.healthClass('AT_RISK')).toBe('health-at-risk');
    expect(component.healthClass('DELAYED')).toBe('health-delayed');
    expect(component.healthClass('COMPLETED')).toBe('health-completed');
  });

  it('healthLabel() maps correctly', () => {
    expect(component.healthLabel('ON_TRACK')).toBe('On Track');
    expect(component.healthLabel('AT_RISK')).toBe('At Risk');
    expect(component.healthLabel('DELAYED')).toBe('Delayed');
    expect(component.healthLabel('COMPLETED')).toBe('Completed');
  });

  it('progressBarClass() returns correct classes', () => {
    expect(component.progressBarClass(100)).toBe('bar-completed');
    expect(component.progressBarClass(80)).toBe('bar-good');
    expect(component.progressBarClass(50)).toBe('bar-medium');
    expect(component.progressBarClass(30)).toBe('bar-low');
  });
});