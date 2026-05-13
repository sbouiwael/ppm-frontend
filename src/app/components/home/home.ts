/**
 * Composant de la page d'accueil (Dashboard).
 * Affiche des graphiques Chart.js adaptes au role de l'utilisateur connecte :
 * - ADMIN : vue complete (taches par statut, utilisateurs par role, portefeuilles, projets, charge)
 * - PMO : portefeuilles, progression projets, charge de travail
 * - PM : taches par statut, charge de son equipe technique
 * - RH : repartition utilisateurs par role, charge de travail
 * - DEV/QA/DEVOPS : leurs affectations personnelles
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth-service';
import { DashboardService, DashboardData } from '../../services/dashboard-service';
import { Chart, ChartType, ChartDataset, registerables } from 'chart.js';

// Enregistrement de tous les modules Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage implements OnInit, OnDestroy {
  /** Utilisateur actuellement connecte */
  user: AuthUser | null = null;
  /** Donnees du tableau de bord recues du backend */
  data: DashboardData | null = null;
  /** Indicateur de chargement */
  loading = true;
  /** Role de l'utilisateur connecte */
  role = '';

  /** Projets geres par le PM connecte */
  myProjects: DashboardData['projectStats'] = [];
  /** Heures totales assignees a l'utilisateur (DEV/QA/DEVOPS) */
  myTotalAssigned = 0;
  /** Capacite hebdomadaire de l'utilisateur (DEV/QA/DEVOPS) */
  myCapacity = 0;
  /** Capacite totale de toute l'equipe */
  totalCapacity = 0;
  /** Heures totales assignees a toute l'equipe */
  totalAssigned = 0;

  /** Tableau des instances Chart.js pour pouvoir les detruire proprement */
  private charts: Chart[] = [];
  /** Message d'erreur du dashboard */
  errorMessage = '';
  /** Subject de destruction pour unsubscribe propre */
  private readonly destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Initialisation : charge les donnees du dashboard et affiche les graphiques */
  ngOnInit(): void {
    this.user = this.auth.currentUser;
    if (!this.user) return;
    this.role = this.user.role;

    this.dashboardService
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (d) => {
          this.data = d;
          this.loading = false;
          this.errorMessage = '';
          this.computeRoleData();
          this.cdr.detectChanges();
          // Rendu des graphiques apres le prochain rafraichissement de l'affichage
          requestAnimationFrame(() => this.renderCharts());
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = 'Impossible de charger les données du tableau de bord.';
          console.error('Dashboard load error:', err);
          this.cdr.detectChanges();
        },
      });
  }

  /** Libere les ressources : detruit les graphiques et complete le subject */
  ngOnDestroy(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Verifie si l'utilisateur possede l'un des roles passes en parametre */
  hasRole(...roles: string[]): boolean {
    return this.auth.hasRole(...roles);
  }

  /**
   * Calcule les donnees specifiques au role de l'utilisateur :
   * - PM : filtre ses propres projets
   * - DEV/QA/DEVOPS : recupere sa charge personnelle
   * - Tous : calcule les totaux de capacite et d'heures assignees
   */
  private computeRoleData(): void {
    if (!this.data || !this.user) return;
    if (this.role === 'PM') {
      this.myProjects = this.data.projectStats.filter((p) => p.managerId === this.user!.userId);
    }
    if (['DEV', 'QA', 'DEVOPS'].includes(this.role)) {
      const me = this.data.workload.find((w) => w.userId === this.user!.userId);
      this.myTotalAssigned = me?.totalAssignedHours ?? 0;
      this.myCapacity = me?.weeklyCapacity ?? 0;
    }
    this.totalCapacity = this.data.workload.reduce((s, w) => s + w.weeklyCapacity, 0);
    this.totalAssigned = this.data.workload.reduce((s, w) => s + w.totalAssignedHours, 0);
  }

  /**
   * Genere les graphiques Chart.js en fonction du role.
   * Detruit les graphiques precedents avant de creer les nouveaux.
   */
  private renderCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    if (!this.data) return;

    const d = this.data;
    // Palette de couleurs pour les graphiques
    const palette = ['#00687B', '#42b7d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    // Couleurs par statut de tache
    const statusColors = ['#90CAF9', '#4CAF50', '#9E9E9E', '#F44336'];
    // Donnees des statuts de taches
    const statusData = [
      d.tasksByStatus['NOT_STARTED'] ?? 0,
      d.tasksByStatus['IN_PROGRESS'] ?? 0,
      d.tasksByStatus['DONE'] ?? 0,
      d.tasksByStatus['BLOCKED'] ?? 0,
    ];
    // Labels des statuts
    const statusLabels = ['Not Started', 'In Progress', 'Done', 'Blocked'];
    // Cles des roles
    const roleKeys = Object.keys(d.usersByRole);
    // Projets actifs (limite a 12 pour la lisibilite)
    const activeProjects = d.projectStats.filter((p) => p.active).slice(0, 12);
    // Fonction utilitaire pour tronquer les noms longs
    const truncate = (s: string) => (s.length > 22 ? s.substring(0, 22) + '...' : s);
    // Labels de charge de travail (prenom + initiale nom)
    type WorkloadEntry = DashboardData['workload'][number];
    const workloadLabels = (wl: WorkloadEntry[]) =>
      wl.map((w) => `${w.firstName} ${w.lastName.charAt(0)}.`);
    // Datasets de charge de travail (capacite vs assigne)
    const workloadDatasets = (wl: WorkloadEntry[]): ChartDataset[] => [
      {
        label: 'Capacite (h/sem)',
        data: wl.map((w) => w.weeklyCapacity),
        backgroundColor: 'rgba(0,104,123,0.25)',
        borderColor: '#00687B',
        borderWidth: 1,
      },
      {
        label: 'Assigne (h)',
        data: wl.map((w) => w.totalAssignedHours),
        backgroundColor: '#42b7d4',
      },
    ];

    // Graphiques adaptes au role
    switch (this.role) {
      case 'ADMIN':
        this.mk('c-a-1', 'doughnut', statusLabels, [
          { data: statusData, backgroundColor: statusColors },
        ]);
        this.mk(
          'c-a-2',
          'bar',
          roleKeys,
          [
            {
              label: 'Users',
              data: roleKeys.map((r) => d.usersByRole[r]),
              backgroundColor: palette,
            },
          ],
          'y',
        );
        this.mk(
          'c-a-3',
          'bar',
          d.portfolioStats.map((p) => p.name),
          [
            {
              label: 'Projets',
              data: d.portfolioStats.map((p) => p.projectCount),
              backgroundColor: '#00687B',
            },
            {
              label: 'Progression %',
              data: d.portfolioStats.map((p) => p.avgProgress),
              backgroundColor: '#42b7d4',
            },
          ],
        );
        this.mk(
          'c-a-4',
          'pie',
          ['Actifs', 'Inactifs'],
          [
            {
              data: [d.totalActiveProjects, d.totalInactiveProjects],
              backgroundColor: ['#10b981', '#9E9E9E'],
            },
          ],
        );
        this.mk(
          'c-a-5',
          'bar',
          activeProjects.map((p) => truncate(p.name)),
          [
            {
              label: 'Progression %',
              data: activeProjects.map((p) => p.progress),
              backgroundColor: '#42b7d4',
            },
          ],
          'y',
        );
        this.mk('c-a-6', 'bar', workloadLabels(d.workload), workloadDatasets(d.workload));
        break;
      case 'PMO':
        this.mk('c-o-1', 'doughnut', statusLabels, [
          { data: statusData, backgroundColor: statusColors },
        ]);
        this.mk(
          'c-o-2',
          'bar',
          d.portfolioStats.map((p) => p.name),
          [
            {
              label: 'Projets',
              data: d.portfolioStats.map((p) => p.projectCount),
              backgroundColor: '#00687B',
            },
            {
              label: 'Progression %',
              data: d.portfolioStats.map((p) => p.avgProgress),
              backgroundColor: '#42b7d4',
            },
          ],
        );
        this.mk(
          'c-o-3',
          'bar',
          activeProjects.map((p) => truncate(p.name)),
          [
            {
              label: 'Progression %',
              data: activeProjects.map((p) => p.progress),
              backgroundColor: '#42b7d4',
            },
          ],
          'y',
        );
        this.mk('c-o-4', 'bar', workloadLabels(d.workload), workloadDatasets(d.workload));
        break;
      case 'PM': {
        this.mk('c-p-1', 'doughnut', statusLabels, [
          { data: statusData, backgroundColor: statusColors },
        ]);
        const teamWorkload = d.workload.filter((w) => ['DEV', 'QA', 'DEVOPS'].includes(w.role));
        this.mk('c-p-2', 'bar', workloadLabels(teamWorkload), workloadDatasets(teamWorkload));
        break;
      }
      case 'RH':
        this.mk(
          'c-r-1',
          'bar',
          roleKeys,
          [
            {
              label: 'Users',
              data: roleKeys.map((r) => d.usersByRole[r]),
              backgroundColor: palette,
            },
          ],
          'y',
        );
        this.mk('c-r-2', 'bar', workloadLabels(d.workload), workloadDatasets(d.workload));
        break;
    }
  }

  /**
   * Methode utilitaire pour creer un graphique Chart.js.
   * @param id - Identifiant de l'element canvas HTML
   * @param type - Type de graphique (bar, doughnut, pie, etc.)
   * @param labels - Labels des donnees
   * @param datasets - Jeux de donnees
   * @param axis - Axe d'index ('y' pour barres horizontales)
   */
  private mk(
    id: string,
    type: ChartType,
    labels: string[],
    datasets: ChartDataset[],
    axis?: string,
  ): void {
    const el = document.getElementById(id) as HTMLCanvasElement;
    if (!el) return;
    const o: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      },
    };
    if (type === 'bar') {
      if (axis === 'y') {
        o.indexAxis = 'y';
        o.scales = {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { grid: { display: false } },
        };
      } else {
        o.scales = {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        };
      }
    }
    this.charts.push(new Chart(el, { type, data: { labels, datasets }, options: o }));
  }
}
