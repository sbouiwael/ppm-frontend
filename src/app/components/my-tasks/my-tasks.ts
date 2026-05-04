/**
 * Composant "My Tasks Dashboard" — espace de travail personnel des contributeurs.
 *
 * Accessible aux roles DEV, QA, DEVOPS (et PM en lecture secondaire via la route).
 * Affiche uniquement les taches affectees a l'utilisateur authentifie.
 *
 * Filtres disponibles :
 *   - Statut (NOT_STARTED, IN_PROGRESS, DONE, BLOCKED)
 *   - En retard (endDate < aujourd'hui et non DONE)
 *   - A traiter cette semaine (endDate dans les 7 prochains jours)
 *   - Projet
 *
 * Mises en evidence visuelles :
 *   - BLOCKED   → bordure et badge orange
 *   - En retard → bordure et badge rouge
 *   - DONE      → opacite reduite
 *
 * Logique Microsoft PPM : "My Tasks" est l'equivalent du tableau de bord personnel
 * d'un contributeur — il voit uniquement ce qui lui est affecte, avec le contexte
 * projet pour naviguer directement vers le detail.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TaskAssignmentService } from '../../services/task-assignment-service';
import { TaskService } from '../../services/task-service';
import { AuthService } from '../../services/auth-service';
import { MyTaskDTO } from '../../models/my-task';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-tasks.html',
  styleUrls: ['./my-tasks.css'],
})
export class MyTasks implements OnInit, OnDestroy {
  /** Toutes les taches chargees depuis l'API */
  allTasks: MyTaskDTO[] = [];
  /** Indicateur de chargement */
  loading = true;
  /** Message d'erreur */
  errorMessage = '';
  /** IDs des taches en cours de mise a jour (pour desactiver le bouton pendant l'appel) */
  updatingTaskIds = new Set<number>();

  // --- Filtres ---
  /** Filtre par statut ('ALL' = aucun filtre) */
  filterStatus = 'ALL';
  /** Filtre : uniquement les taches en retard */
  filterOverdue = false;
  /** Filtre : uniquement les taches dues cette semaine */
  filterDueSoon = false;
  /** Filtre par projet (ID ou '' pour tous) */
  filterProjectId = '';

  /** Liste des projets distincts presents dans les taches (pour le selecteur) */
  projects: { id: number; name: string }[] = [];

  /** Date d'aujourd'hui (UTC, pour calculs de retard) */
  readonly today = new Date().toISOString().split('T')[0];

  /** Date dans 7 jours (pour filtre "cette semaine") */
  readonly inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private assignmentService: TaskAssignmentService,
    private taskService: TaskService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.assignmentService.getMyTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.allTasks = tasks;
          this.loading = false;
          this.buildProjectList();
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Unable to load your tasks. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Construit la liste des projets distincts a partir des taches chargees.
   * Utilise pour le selecteur de filtre par projet.
   */
  private buildProjectList(): void {
    const seen = new Set<number>();
    this.projects = this.allTasks
      .filter(t => { const n = !seen.has(t.projectId); seen.add(t.projectId); return n; })
      .map(t => ({ id: t.projectId, name: t.projectName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Retourne les taches filtrees selon les criteres actifs.
   * Les filtres s'appliquent en AND.
   */
  get filteredTasks(): MyTaskDTO[] {
    return this.allTasks.filter(t => {
      if (this.filterStatus !== 'ALL' && t.taskStatus !== this.filterStatus) return false;
      if (this.filterOverdue && !this.isOverdue(t)) return false;
      if (this.filterDueSoon && !this.isDueSoon(t)) return false;
      if (this.filterProjectId && String(t.projectId) !== this.filterProjectId) return false;
      return true;
    });
  }

  /**
   * Indique si une tache est en retard.
   * Condition : endDate < aujourd'hui ET statut != DONE
   */
  isOverdue(t: MyTaskDTO): boolean {
    return !!t.endDate && t.endDate < this.today && t.taskStatus !== 'DONE';
  }

  /**
   * Indique si une tache est due dans les 7 prochains jours.
   * Condition : endDate entre aujourd'hui et aujourd'hui + 7 jours ET statut != DONE
   */
  isDueSoon(t: MyTaskDTO): boolean {
    return !!t.endDate
      && t.endDate >= this.today
      && t.endDate <= this.inOneWeek
      && t.taskStatus !== 'DONE';
  }

  /** Retourne la classe CSS appliquee sur la carte selon l'etat de la tache */
  getTaskCardClass(t: MyTaskDTO): string {
    if (t.taskStatus === 'BLOCKED') return 'task-card task-card--blocked';
    if (this.isOverdue(t))          return 'task-card task-card--overdue';
    if (t.taskStatus === 'DONE')    return 'task-card task-card--done';
    if (this.isDueSoon(t))          return 'task-card task-card--due-soon';
    return 'task-card';
  }

  /** Retourne le label lisible pour un statut */
  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      NOT_STARTED: 'Not Started',
      IN_PROGRESS: 'In Progress',
      DONE: 'Done',
      BLOCKED: 'Blocked',
    };
    return labels[status] ?? status;
  }

  /** Remet tous les filtres a zero */
  resetFilters(): void {
    this.filterStatus = 'ALL';
    this.filterOverdue = false;
    this.filterDueSoon = false;
    this.filterProjectId = '';
  }

  // ── Quick Actions ─────────────────────────────────────────────────────────

  /**
   * Retourne les boutons d'action rapide disponibles selon le statut actuel.
   * Ne propose jamais d'action inutile (pas de "Start" si deja IN_PROGRESS).
   */
  quickActions(task: MyTaskDTO): { label: string; status: string; css: string }[] {
    switch (task.taskStatus) {
      case 'NOT_STARTED':
        return [{ label: 'Start', status: 'IN_PROGRESS', css: 'btn-quick btn-quick--start' }];
      case 'IN_PROGRESS':
        return [
          { label: 'Mark Done',    status: 'DONE',       css: 'btn-quick btn-quick--done'    },
          { label: 'Mark Blocked', status: 'BLOCKED',    css: 'btn-quick btn-quick--blocked' },
        ];
      case 'BLOCKED':
        return [{ label: 'Resume', status: 'IN_PROGRESS', css: 'btn-quick btn-quick--start' }];
      case 'DONE':
        return [{ label: 'Reopen', status: 'IN_PROGRESS', css: 'btn-quick btn-quick--reopen' }];
      default:
        return [];
    }
  }

  /**
   * Applique une action rapide de changement de statut.
   * Met a jour la tache localement apres confirmation du serveur pour un feedback immediat.
   */
  applyQuickAction(task: MyTaskDTO, newStatus: string): void {
    if (this.updatingTaskIds.has(task.taskId)) return; // anti-double-clic
    this.updatingTaskIds.add(task.taskId);

    this.taskService.patchTaskStatus(task.taskId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          // Mise a jour locale de la tache pour un feedback immediat sans rechargement complet
          task.taskStatus   = updated.status ?? newStatus;
          task.taskProgress = updated.progress ?? task.taskProgress;
          this.updatingTaskIds.delete(task.taskId);
          this.cdr.detectChanges();
        },
        error: () => {
          this.updatingTaskIds.delete(task.taskId);
          this.cdr.detectChanges();
        },
      });
  }
}