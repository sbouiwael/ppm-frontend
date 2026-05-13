/**
 * Composant de gestion des dependances d'une tache.
 * Permet de visualiser, ajouter et supprimer les dependances
 * (predecesseurs et successeurs) d'une tache.
 * Les types de dependance supportes sont : FS, SS, FF, SF.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Subject, switchMap, takeUntil, EMPTY } from 'rxjs';

import { TaskDependencyService } from '../../services/task-dependency-service';
import { AuthService } from '../../services/auth-service';
import { TaskService } from '../../services/task-service';
import {
  TaskDependencyDTO,
  TaskDependencyCreateRequest,
  DependencyType,
} from '../../models/task-dependency';
import { TaskDTO } from '../../models/task';

/** Direction de la dependance : predecesseur ou successeur */
type Direction = 'PREDECESSOR' | 'SUCCESSOR';

@Component({
  selector: 'app-task-dependencies',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './task-dependencies.html',
  styleUrl: './task-dependencies.css',
})
export class TaskDependencies implements OnInit, OnDestroy {
  /** Identifiant de la tache concernee */
  taskId!: number;

  /** Liste des dependances ou cette tache est successeur */
  predecessors: TaskDependencyDTO[] = [];
  /** Liste des dependances ou cette tache est predecesseur */
  successors: TaskDependencyDTO[] = [];
  /** Taches du meme projet (pour le selecteur — exclut la tache courante) */
  siblingTasks: TaskDTO[] = [];
  /** Nom de la tache courante (pour le fallback d'affichage) */
  currentTaskName = '';

  /** Message d'erreur */
  errorMessage = '';
  /** Subject de destruction pour unsubscribe propre */
  private readonly destroy$ = new Subject<void>();
  /** Indicateur de chargement */
  loading = false;

  /** Formulaire reactif pour creer une nouvelle dependance */
  form: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private depService: TaskDependencyService,
    private taskService: TaskService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      otherTaskId: [null, [Validators.required, Validators.min(1)]],
      direction: ['PREDECESSOR' as Direction, Validators.required],
      type: ['FS' as DependencyType, Validators.required],
    });
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    this.taskId = Number(raw);

    if (!Number.isFinite(this.taskId) || this.taskId <= 0) {
      this.errorMessage = 'Invalid task id';
      return;
    }

    this.load();
    this.loadSiblingTasks();
  }

  /** Charge les taches du meme projet (pour le selecteur de dependances) */
  loadSiblingTasks(): void {
    this.taskService
      .getTaskById(this.taskId)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((task) => {
          if (task?.name) this.currentTaskName = task.name;
          return task?.projectId ? this.taskService.getTasksByProject(task.projectId) : EMPTY;
        }),
      )
      .subscribe({
        next: (tasks) => {
          const all = tasks ?? [];
          const current = all.find((t) => t.id === this.taskId);
          if (current?.name) this.currentTaskName = current.name;
          this.siblingTasks = all.filter((t) => t.id !== this.taskId && t.active !== false);
          this.cdr.detectChanges();
        },
        error: () => {
          this.siblingTasks = [];
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Fallback: retourne le nom d'une tache par son ID — utilise quand le DTO ne contient pas le nom */
  getTaskName(taskId: number): string {
    if (taskId === this.taskId && this.currentTaskName) {
      return this.currentTaskName;
    }
    const task = this.siblingTasks.find((t) => t.id === taskId);
    return task ? task.name : `Task #${taskId}`;
  }

  /** Retourne le libelle complet d'un type de dependance */
  typeLabel(type: string | undefined): string {
    const labels: Record<string, string> = {
      FS: 'Finish → Start',
      SS: 'Start → Start',
      FF: 'Finish → Finish',
      SF: 'Start → Finish',
    };
    return type ? (labels[type] ?? type) : 'FS';
  }

  /** Charge les predecesseurs et successeurs de cette tache */
  load(): void {
    this.errorMessage = '';

    this.depService.getPredecessors(this.taskId).subscribe({
      next: (data) => {
        this.predecessors = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.predecessors = [];
        this.errorMessage = 'Error loading predecessors';
        this.cdr.detectChanges();
      },
    });

    this.depService.getSuccessors(this.taskId).subscribe({
      next: (data) => {
        this.successors = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.successors = [];
        this.errorMessage = 'Error loading successors';
        this.cdr.detectChanges();
      },
    });
  }

  /** Valide et soumet le formulaire pour creer une nouvelle dependance */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const otherTaskId = Number(this.form.value.otherTaskId);
    const direction = String(this.form.value.direction) as Direction;
    const type = this.form.value.type as DependencyType;

    if (!Number.isFinite(otherTaskId) || otherTaskId <= 0) {
      this.loading = false;
      this.errorMessage = 'Invalid other task id';
      return;
    }

    const req: TaskDependencyCreateRequest =
      direction === 'PREDECESSOR'
        ? {
            predecessorTaskId: otherTaskId,
            successorTaskId: this.taskId,
            type,
          }
        : {
            predecessorTaskId: this.taskId,
            successorTaskId: otherTaskId,
            type,
          };

    this.depService.create(req).subscribe({
      next: () => {
        this.loading = false;
        this.form.reset({ otherTaskId: null, direction: 'PREDECESSOR', type: 'FS' });
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;

        // si ton backend renvoie message dans err.error.message
        this.errorMessage =
          err?.error?.message ||
          'Error creating dependency (check same project / duplicate / self-dependency)';
        this.cdr.detectChanges();
      },
    });
  }

  /** Supprime une dependance */
  remove(dep: TaskDependencyDTO): void {
    if (!dep?.id) return;

    this.depService.delete(dep.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error deleting dependency';
        this.cdr.detectChanges();
      },
    });
  }
}
