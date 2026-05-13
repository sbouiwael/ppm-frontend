/**
 * Composant d'edition d'une tache existante.
 * Charge en parallele les projets et la tache a editer (forkJoin),
 * pre-remplit le formulaire avec les valeurs existantes.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth-service';

import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { TaskService } from '../../services/task-service';
import { ProjectService } from '../../services/project-service';
import { TaskDTO } from '../../models/task';
import { ProjectDTO } from '../../models/project';

@Component({
  selector: 'app-task-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './task-edit.html',
  styleUrls: ['./task-edit.css'],
})
export class TaskEdit implements OnInit, OnDestroy, HasUnsavedChanges {
  /** Formulaire reactif d'edition de tache */
  form: FormGroup;
  /** Message d'erreur */
  errorMessage = '';
  /** Indicateur de soumission en cours */
  loading = false;
  /** Indicateur de chargement initial des donnees */
  loadingData = true;
  /** Identifiant de la tache en cours d'edition */
  taskId!: number;

  /** Liste des projets actifs */
  projects: ProjectDTO[] = [];
  /** Liste des taches du projet selectionne (pour le selecteur de tache parente) */
  parentTasks: TaskDTO[] = [];
  /** Indique si la modification a reussi — empeche le declenchement du guard apres sauvegarde */
  private savedSuccessfully = false;
  /** Subject de destruction pour unsubscribe propre */
  private readonly destroy$ = new Subject<void>();

  /** Indique si l'utilisateur est un membre technique (ne peut modifier que progress/statut) */
  get isTeamMember(): boolean {
    return this.auth.hasRole('DEV', 'QA', 'DEVOPS');
  }

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
  ) {
    this.form = this.fb.group({
      projectId: [null, [Validators.required, Validators.min(1)]],
      parentTaskId: [null],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      wbsNumber: [''],
      mode: ['TASK'],
      durationDays: [1.0, [Validators.required, Validators.min(0.1)]],
      workHours: [null, [Validators.min(0)]],
      sortOrder: [0, [Validators.min(0)]],
      startDate: [''],
      endDate: [''],
      status: ['NOT_STARTED'],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      active: [true],
    });
  }

  /** Charge les projets et la tache en parallele, puis pre-remplit le formulaire */
  ngOnInit(): void {
    this.taskId = Number(this.route.snapshot.paramMap.get('id'));

    // Watch project changes to reload parent task options
    this.form
      .get('projectId')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((pid) => {
        this.form.patchValue({ parentTaskId: null }, { emitEvent: false });
        this.parentTasks = [];
        if (pid) this.loadParentTasks(pid);
      });

    forkJoin({
      projects: this.projectService.getAllProjects(),
      task: this.taskService.getTaskById(this.taskId),
    }).subscribe({
      next: ({ projects, task }) => {
        this.projects = (projects ?? []).filter((p) => p.active !== false);

        // Render the form + <select> options first
        this.loadingData = false;
        this.cdr.detectChanges();

        // Patch with emitEvent:false to prevent valueChanges from clearing parentTaskId
        // and triggering a redundant loadParentTasks during initial data load.
        this.form.patchValue(
          {
            projectId: task.projectId,
            parentTaskId: task.parentTaskId ?? null,
            name: task.name,
            description: task.description ?? '',
            wbsNumber: task.wbsNumber ?? '',
            mode: task.mode ?? 'TASK',
            durationDays: task.durationDays ?? 1.0,
            workHours: task.workHours ?? null,
            sortOrder: task.sortOrder ?? 0,
            startDate: task.startDate ?? '',
            endDate: task.endDate ?? '',
            status: task.status ?? 'NOT_STARTED',
            progress: task.progress ?? 0,
            active: task.active ?? true,
          },
          { emitEvent: false },
        );

        // Load parent tasks AFTER patching so parentTaskId is already set when options arrive
        if (task.projectId) {
          this.loadParentTasks(task.projectId, task.id);
        }

        // Membres techniques (DEV/QA/DEVOPS) : lecture seule sauf progress/status/actualWorkHours
        if (this.isTeamMember) {
          this.form.get('name')?.disable();
          this.form.get('description')?.disable();
          this.form.get('projectId')?.disable();
          this.form.get('parentTaskId')?.disable();
          this.form.get('wbsNumber')?.disable();
          this.form.get('mode')?.disable();
          this.form.get('durationDays')?.disable();
          this.form.get('workHours')?.disable();
          this.form.get('sortOrder')?.disable();
          this.form.get('startDate')?.disable();
          this.form.get('endDate')?.disable();
          this.form.get('active')?.disable();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loadingData = false;
        this.errorMessage = 'Error loading task data';
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Charge les taches actives du projet donne pour le selecteur de tache parente */
  private loadParentTasks(projectId: number, excludeTaskId?: number): void {
    this.taskService.getTasksByProject(projectId).subscribe({
      next: (tasks) => {
        this.parentTasks = (tasks ?? []).filter(
          (t) => t.active !== false && t.id !== excludeTaskId,
        );
      },
      error: (err) => console.error('Failed to load parent tasks', err),
    });
  }

  /** HasUnsavedChanges : retourne true si le formulaire a ete modifie sans etre sauvegarde */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  /** Valide et soumet le formulaire de mise a jour de la tache */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // PHASE 2 RBAC : les membres techniques utilisent l'endpoint /operational restreint.
    // Cela garantit que le backend rejette toute tentative de modifier les champs de planification,
    // meme si le frontend est bypasse.
    if (this.isTeamMember) {
      const v = this.form.value;
      const operationalPayload = {
        status: v.status ?? undefined,
        progress: v.progress !== null && v.progress !== undefined ? Number(v.progress) : undefined,
        actualWorkHours: null as number | null | undefined,
      };

      this.taskService.patchOperational(this.taskId, operationalPayload).subscribe({
        next: () => {
          this.savedSuccessfully = true;
          this.router.navigateByUrl('/tasks');
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          this.errorMessage =
            typeof err?.error === 'string'
              ? err.error
              : (err?.error?.message ?? 'Error updating task');
          this.cdr.detectChanges();
        },
      });
      return;
    }

    // Mise a jour complete — ADMIN / PMO / PM via PUT
    const rv = this.form.getRawValue(); // getRawValue inclut les champs desactives

    const payload: TaskDTO = {
      projectId: Number(rv.projectId),
      parentTaskId: rv.parentTaskId ? Number(rv.parentTaskId) : null,
      name: String(rv.name).trim(),
      description: rv.description ? String(rv.description).trim() : null,
      wbsNumber: rv.wbsNumber ? String(rv.wbsNumber).trim() : null,
      mode: rv.mode ? String(rv.mode).trim() : 'TASK',
      durationDays:
        rv.durationDays !== null && rv.durationDays !== undefined ? Number(rv.durationDays) : 1.0,
      workHours:
        rv.workHours !== null && rv.workHours !== undefined && rv.workHours !== ''
          ? Number(rv.workHours)
          : null,
      sortOrder: rv.sortOrder !== null && rv.sortOrder !== undefined ? Number(rv.sortOrder) : 0,
      startDate: rv.startDate ? rv.startDate : null,
      endDate: rv.endDate ? rv.endDate : null,
      status: rv.status,
      progress: Number(rv.progress),
      active: !!rv.active,
    };

    this.taskService.updateTask(this.taskId, payload).subscribe({
      next: () => {
        this.savedSuccessfully = true;
        this.router.navigateByUrl('/tasks');
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage =
          typeof err?.error === 'string'
            ? err.error
            : (err?.error?.message ?? 'Error updating task');
        this.cdr.detectChanges();
      },
    });
  }
}
