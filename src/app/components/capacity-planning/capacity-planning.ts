/**
 * Composant "Resource Capacity Planning".
 * Accessible aux roles ADMIN, PMO, PM.
 *
 * Affiche la vue consolidee capacite/charge de toutes les ressources actives.
 * Permet de detecter les ressources surchargees (OVERLOADED) et de reequilibrer
 * les affectations avant qu'elles n'impactent les delais projets.
 *
 * Filtres disponibles :
 *   - Role (DEV, QA, DEVOPS, etc.)
 *   - Statut de capacite (OVERLOADED, BALANCED, UNDERUTILIZED, NO_CAPACITY)
 *   - Projet (filtre les heures par projet specifique)
 *
 * Logique Microsoft PPM :
 *   "Resource Capacity Planning" est une fonctionnalite cle qui permet aux
 *   gestionnaires de visualiser l'ecart entre la charge planifiee et la
 *   capacite disponible, et de reequilibrer les affectations en consequence.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { CapacityService } from '../../services/capacity-service';
import { ProjectService } from '../../services/project-service';
import { ResourceCapacityDTO } from '../../models/resource-capacity';
import { WeeklyCapacityDTO, WeekSlot } from '../../models/weekly-capacity';
import { ProjectDTO } from '../../models/project';

@Component({
  selector: 'app-capacity-planning',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './capacity-planning.html',
  styleUrls: ['./capacity-planning.css'],
})
export class CapacityPlanning implements OnInit, OnDestroy {
  /** Vue active : 'overview' ou 'weekly' */
  activeView: 'overview' | 'weekly' = 'overview';

  /** Toutes les ressources chargees depuis l'API */
  allResources: ResourceCapacityDTO[] = [];
  /** Donnees hebdomadaires */
  weeklyData: WeeklyCapacityDTO[] = [];
  /** Labels des semaines (extraits du premier utilisateur) */
  weekLabels: string[] = [];
  /** Liste des projets pour le filtre */
  projects: ProjectDTO[] = [];
  /** Indicateur de chargement */
  loading = true;
  /** Message d'erreur */
  errorMessage = '';

  // --- Filtres ---
  /** Filtre par role */
  filterRole = '';
  /** Filtre par statut de capacite */
  filterStatus = '';
  /** Filtre par projet (charge les heures uniquement pour ce projet) */
  selectedProjectId: number | undefined;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private capacityService: CapacityService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadCapacity();
    this.loadWeekly();
  }

  switchView(view: 'overview' | 'weekly'): void {
    this.activeView = view;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.projectService
      .getAllProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects.filter((p) => p.active !== false);
          this.cdr.detectChanges();
        },
        error: () => {
          this.projects = [];
          this.cdr.detectChanges();
        },
      });
  }

  /** Recharge les donnees de capacite avec le filtre projet actuel */
  loadCapacity(): void {
    this.loading = true;
    this.errorMessage = '';
    this.capacityService
      .getCapacityOverview(this.filterRole || undefined, this.selectedProjectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allResources = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Unable to load capacity data. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  /** Applique le filtre de role et recharge depuis l'API */
  onRoleFilterChange(): void {
    this.loadCapacity();
    this.loadWeekly();
  }

  /** Applique le filtre de projet et recharge depuis l'API */
  onProjectFilterChange(): void {
    this.loadCapacity();
  }

  /** Charge les donnees hebdomadaires */
  loadWeekly(): void {
    this.capacityService
      .getWeeklyCapacity(12, this.filterRole || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.weeklyData = data;
          this.weekLabels = data[0]?.weeks?.map((w: WeekSlot) => w.weekLabel) ?? [];
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  /** Retourne les ressources filtrees par statut (filtre local — pas d'appel API) */
  get filteredResources(): ResourceCapacityDTO[] {
    if (!this.filterStatus) return this.allResources;
    return this.allResources.filter((r) => r.capacityStatus === this.filterStatus);
  }

  /** Retourne le nombre de ressources par statut */
  countByStatus(status: string): number {
    return this.allResources.filter((r) => r.capacityStatus === status).length;
  }

  /** Retourne la classe CSS pour la barre de progression selon l'utilisation */
  getUtilizationBarClass(status: string): string {
    switch (status) {
      case 'OVERLOADED':
        return 'util-bar util-bar--overloaded';
      case 'BALANCED':
        return 'util-bar util-bar--balanced';
      case 'NO_CAPACITY':
        return 'util-bar util-bar--no-capacity';
      default:
        return 'util-bar util-bar--underutilized';
    }
  }

  /** Retourne la classe CSS pour le badge de statut */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'OVERLOADED':
        return 'badge badge-error';
      case 'BALANCED':
        return 'badge badge-success';
      case 'NO_CAPACITY':
        return 'badge badge-warning';
      default:
        return 'badge badge-primary';
    }
  }

  /** Label lisible pour le statut */
  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      OVERLOADED: 'Overloaded',
      BALANCED: 'Balanced',
      UNDERUTILIZED: 'Underutilized',
      NO_CAPACITY: 'No Capacity',
    };
    return labels[status] ?? status;
  }

  /** Remet tous les filtres a zero et recharge */
  resetFilters(): void {
    this.filterRole = '';
    this.filterStatus = '';
    this.selectedProjectId = undefined;
    this.loadCapacity();
    this.loadWeekly();
  }

  /** Classe CSS pour une cellule de la heatmap hebdomadaire */
  weekCellClass(status: string): string {
    switch (status) {
      case 'OVERLOADED':
        return 'week-cell week-cell--overloaded';
      case 'BALANCED':
      case 'NEAR_CAPACITY':
        return 'week-cell week-cell--balanced';
      case 'NO_CAPACITY':
        return 'week-cell week-cell--no-capacity';
      default:
        return 'week-cell week-cell--underutilized';
    }
  }

  /** Clamp pour la barre de progression (max 100%) */
  clampPct(pct: number): number {
    return Math.min(pct, 100);
  }
}
