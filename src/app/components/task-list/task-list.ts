/**
 * Composant de la liste des taches — version enterprise upgrade.
 *
 * NOUVEAUTES (Phase 5) :
 *   - Affichage du nom de la tache parente sur chaque sous-tache
 *   - Badge de type : ROOT / SUMMARY / SUBTASK / MILESTONE
 *   - Tri par WBS / hierarchie
 *   - Bouton "Add Subtask" sur chaque tache
 *   - Lien "View in Gantt" sur chaque tache
 *   - Confirmation de suppression avec avertissement si la tache a des enfants
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TaskService } from '../../services/task-service';
import { AuthService } from '../../services/auth-service';
import { ProjectService } from '../../services/project-service';
import { ProjectDTO } from '../../models/project';
import { TaskDTO } from '../../models/task';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { Pagination } from '../pagination/pagination';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, ConfirmDialog, Pagination],
  templateUrl: './task-list.html',
  styleUrls: ['./task-list.css'],
})
export class TaskList implements OnInit, OnDestroy {
  tasks: TaskDTO[] = [];
  loading = false;
  errorMessage = '';

  projectId: number | null = null;
  projects: ProjectDTO[] = [];

  searchTerm = '';
  sortBy = 'wbs';

  currentPage = 1;
  pageSize = 6;

  showDeleteConfirm = false;
  deleteTarget: TaskDTO | null = null;
  /** Message de confirmation contextuel (avec avertissement si tache parente) */
  deleteMessage = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    public auth: AuthService,
  ) {}

  get canWrite(): boolean {
    return this.auth.hasRole('ADMIN', 'PMO', 'PM');
  }
  get canCreate(): boolean {
    return this.canWrite;
  }
  get canEdit(): boolean {
    return this.auth.hasRole('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS');
  }
  get canDelete(): boolean {
    return this.canWrite;
  }

  ngOnInit(): void {
    this.loadProjects();

    const qp = this.route.snapshot.queryParamMap;
    const pid = Number(qp.get('projectId'));
    if (pid > 0) {
      this.projectId = pid;
      this.loadTasks();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProjects(): void {
    this.projectService
      .getAllProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.projects = Array.isArray(data) ? data : [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.projects = [];
        },
      });
  }

  onProjectChange(): void {
    this.tasks = [];
    this.searchTerm = '';
    this.currentPage = 1;
    if (this.projectId) this.loadTasks();
  }

  loadTasks(): void {
    if (!this.projectId || this.projectId <= 0) {
      this.tasks = [];
      this.errorMessage = 'Please select a project';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.tasks = [];

    this.taskService
      .getTasksByProject(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tasks = Array.isArray(data) ? data : [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.tasks = [];
          this.errorMessage =
            err?.error?.message ||
            (typeof err?.error === 'string'
              ? err.error
              : `Error ${err.status}: failed to load tasks`);
          this.cdr.detectChanges();
        },
      });
  }

  // ─── Hierarchy helpers ──────────────────────────────────────────

  /** Retourne le type de tache pour le badge UX */
  getTaskType(task: TaskDTO): 'summary' | 'subtask' | 'milestone' | 'root' {
    if (task.durationDays === 0) return 'milestone';
    if (task.hasChildren) return 'summary';
    if (task.parentTaskId) return 'subtask';
    return 'root';
  }

  getTaskTypeLabel(task: TaskDTO): string {
    switch (this.getTaskType(task)) {
      case 'summary':
        return 'Summary';
      case 'subtask':
        return 'Subtask';
      case 'milestone':
        return 'Milestone';
      default:
        return 'Task';
    }
  }

  getTaskTypeBadgeClass(task: TaskDTO): string {
    switch (this.getTaskType(task)) {
      case 'summary':
        return 'badge-summary';
      case 'subtask':
        return 'badge-subtask';
      case 'milestone':
        return 'badge-milestone';
      default:
        return 'badge-root';
    }
  }

  /** Trie par WBS : ordre numerique naturel (1 < 1.1 < 1.2 < 2) */
  compareWbs(a: string | null | undefined, b: string | null | undefined): number {
    const partsA = (a ?? '0').split('.').map(Number);
    const partsB = (b ?? '0').split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
      const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  get filteredTasks(): TaskDTO[] {
    let result = this.tasks;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.status?.toLowerCase().includes(term) ||
          t.startDate?.includes(term) ||
          t.endDate?.includes(term) ||
          t.wbsNumber?.toLowerCase().includes(term) ||
          t.parentTaskName?.toLowerCase().includes(term) ||
          t.progress?.toString().includes(term) ||
          t.workHours?.toString().includes(term) ||
          t.durationDays?.toString().includes(term) ||
          (t.active !== false ? 'active' : 'inactive').includes(term),
      );
    }

    result = [...result].sort((a, b) => {
      switch (this.sortBy) {
        case 'wbs':
          return this.compareWbs(a.wbsNumber, b.wbsNumber);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'startDate-asc':
          return (a.startDate || '').localeCompare(b.startDate || '');
        case 'startDate-desc':
          return (b.startDate || '').localeCompare(a.startDate || '');
        case 'progress-desc':
          return (b.progress ?? 0) - (a.progress ?? 0);
        case 'progress-asc':
          return (a.progress ?? 0) - (b.progress ?? 0);
        case 'duration-desc':
          return (b.durationDays ?? 0) - (a.durationDays ?? 0);
        case 'duration-asc':
          return (a.durationDays ?? 0) - (b.durationDays ?? 0);
        case 'status': {
          const order: Record<string, number> = {
            BLOCKED: 0,
            IN_PROGRESS: 1,
            NOT_STARTED: 2,
            DONE: 3,
          };
          return (order[a.status || ''] ?? 99) - (order[b.status || ''] ?? 99);
        }
        default:
          return 0;
      }
    });

    return result;
  }

  get paginatedTasks(): TaskDTO[] {
    const filtered = this.filteredTasks;
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  get totalFiltered(): number {
    return this.filteredTasks.length;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onEdit(task: TaskDTO, event: Event): void {
    event.stopPropagation();
    if (task.id) this.router.navigate(['/tasks', task.id, 'edit']);
  }

  onCardDblClick(task: TaskDTO): void {
    if (task.id) this.router.navigate(['/tasks', task.id, 'edit']);
  }

  /** Naviguer vers la creation avec parentTaskId pre-selectionne */
  onAddSubtask(task: TaskDTO, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/tasks/create'], {
      queryParams: { projectId: this.projectId, parentTaskId: task.id },
    });
  }

  /** Naviguer vers le Gantt du projet */
  onViewInGantt(event: Event): void {
    event.stopPropagation();
    if (this.projectId) {
      this.router.navigate(['/projects', this.projectId, 'gantt']);
    }
  }

  askDelete(task: TaskDTO, event: Event): void {
    event.stopPropagation();
    this.deleteTarget = task;
    // Message contextuel : avertir si la tache a des enfants
    if (task.hasChildren) {
      this.deleteMessage =
        `'${task.name}' is a summary task with subtasks. ` +
        `You must delete or reassign its subtasks before deleting it.`;
    } else {
      this.deleteMessage = `Are you sure you want to permanently delete '${task.name}'? This cannot be undone.`;
    }
    this.showDeleteConfirm = true;
  }

  toggleActive(task: TaskDTO, event: Event): void {
    event.stopPropagation();
    if (!task.id) return;
    this.taskService.setTaskActive(task.id, !task.active).subscribe({
      next: () => this.loadTasks(),
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : 'Error updating task status');
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) return;
    // Ne pas tenter de supprimer si la tache a des enfants — le backend le bloquera de toute façon.
    // On ferme le dialog et affiche le message d'erreur propre.
    if (this.deleteTarget.hasChildren) {
      this.showDeleteConfirm = false;
      this.errorMessage = `Cannot delete '${this.deleteTarget.name}': it has active subtasks. Delete or reassign them first.`;
      this.deleteTarget = null;
      this.cdr.detectChanges();
      return;
    }

    this.taskService.deleteTask(this.deleteTarget.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
        this.loadTasks();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || err?.error || 'Error deleting task';
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
        this.cdr.detectChanges();
      },
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
  }
}
