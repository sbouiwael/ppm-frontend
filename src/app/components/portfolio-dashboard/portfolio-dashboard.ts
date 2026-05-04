/**
 * Composant tableau de bord executif portefeuille (Wave 2).
 * KPIs, graphiques Chart.js et tableau de sante des projets.
 * RBAC : ADMIN, PMO, PM.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Chart, ChartType, ChartDataset, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard-service';
import { PortfolioDashboardDTO, ProjectHealthSummary, HealthStatus } from '../../models/portfolio-dashboard';

Chart.register(...registerables);

@Component({
  selector: 'app-portfolio-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './portfolio-dashboard.html',
  styleUrl: './portfolio-dashboard.css',
})
export class PortfolioDashboard implements OnInit, OnDestroy {
  data: PortfolioDashboardDTO | null = null;
  loading = true;
  errorMessage = '';

  // Search & filter for health table
  healthFilter: HealthStatus | '' = '';
  searchTerm = '';

  private charts: Chart[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
  ) {}

  ngOnInit(): void {
    this.dashboardService.getPortfolioDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (d) => {
          this.data    = d;
          this.loading = false;
          this.cdr.detectChanges();
          requestAnimationFrame(() => this.renderCharts());
        },
        error: (err) => {
          this.loading      = false;
          this.errorMessage = `Error ${err.status} — failed to load portfolio dashboard.`;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filtered health table ─────────────────────────────────────────────────

  get filteredProjects(): ProjectHealthSummary[] {
    if (!this.data) return [];
    let result = this.data.projectHealthOverview;
    if (this.healthFilter) {
      result = result.filter(p => p.healthStatus === this.healthFilter);
    }
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(t) ||
        (p.portfolioName ?? '').toLowerCase().includes(t),
      );
    }
    return result;
  }

  // ── Drill-down navigation ─────────────────────────────────────────────────

  /**
   * Active un filtre sur le tableau de sante et fait defiler vers celui-ci.
   * Permet de cliquer sur une KPI card pour voir directement les projets concernes.
   */
  drillDown(filter: HealthStatus | ''): void {
    this.healthFilter = filter;
    this.searchTerm   = '';
    // Scroll vers la section health-table
    const section = this.el.nativeElement.querySelector('.health-section');
    if (section) {
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  // ── Health badge helpers ──────────────────────────────────────────────────

  healthClass(status: HealthStatus): string {
    switch (status) {
      case 'ON_TRACK':  return 'health-on-track';
      case 'AT_RISK':   return 'health-at-risk';
      case 'DELAYED':   return 'health-delayed';
      case 'COMPLETED': return 'health-completed';
      default:          return '';
    }
  }

  healthLabel(status: HealthStatus): string {
    const labels: Record<HealthStatus, string> = {
      ON_TRACK: 'On Track', AT_RISK: 'At Risk',
      DELAYED: 'Delayed',   COMPLETED: 'Completed',
    };
    return labels[status] ?? status;
  }

  progressBarClass(pct: number): string {
    if (pct >= 100)  return 'bar-completed';
    if (pct >= 75)   return 'bar-good';
    if (pct >= 40)   return 'bar-medium';
    return 'bar-low';
  }

  // ── Chart rendering ───────────────────────────────────────────────────────

  private renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    if (!this.data) return;

    const d = this.data;
    const PRIMARY = '#00687B';
    const ACCENT  = '#42b7d4';

    // Chart 1 — Tasks by status (doughnut)
    const statusLabels = ['Not Started', 'In Progress', 'Done', 'Blocked'];
    const statusData   = [
      d.tasksByStatus['NOT_STARTED'] ?? 0,
      d.tasksByStatus['IN_PROGRESS'] ?? 0,
      d.tasksByStatus['DONE']        ?? 0,
      d.tasksByStatus['BLOCKED']     ?? 0,
    ];
    this.mk('pd-chart-status', 'doughnut', statusLabels, [{
      data: statusData,
      backgroundColor: ['#90CAF9', '#4CAF50', '#9E9E9E', '#F44336'],
    }]);

    // Chart 2 — Project health distribution (pie)
    this.mk('pd-chart-health', 'pie',
      ['On Track', 'At Risk', 'Delayed', 'Completed'],
      [{ data: [
        d.onTrackProjectsCount, d.atRiskProjectsCount,
        d.delayedProjectsCount, d.completedProjectsCount,
      ], backgroundColor: ['#10b981', '#f59e0b', '#ef4444', PRIMARY] }],
    );

    // Chart 3 — Portfolio bar (projects + avg progress)
    if (d.portfolioSummaries.length > 0) {
      this.mk('pd-chart-portfolios', 'bar',
        d.portfolioSummaries.map(p => p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name),
        [
          { label: 'Projects',     data: d.portfolioSummaries.map(p => p.projectCount),    backgroundColor: PRIMARY  },
          { label: 'Avg Progress', data: d.portfolioSummaries.map(p => p.avgProgress),     backgroundColor: ACCENT  },
        ],
      );
    }
  }

  private mk(
    id: string,
    type: ChartType,
    labels: string[],
    datasets: ChartDataset[],
  ): void {
    const el = document.getElementById(id) as HTMLCanvasElement;
    if (!el) return;
    const opts: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { boxWidth: 12, font: { size: 11 } },
        },
      },
    };
    if (type === 'bar') {
      opts.scales = {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      };
    }
    this.charts.push(new Chart(el, { type, data: { labels, datasets }, options: opts }));
  }
}