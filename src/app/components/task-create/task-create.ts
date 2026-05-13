/**
 * Composant de creation d'une nouvelle tache.
 * Affiche un formulaire reactif avec tous les champs de la tache.
 * Le projet peut etre pre-selectionne via un queryParam projectId.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { TaskService } from '../../services/task-service';
import { ProjectService } from '../../services/project-service';
import { TaskDTO } from '../../models/task';
import { ProjectDTO } from '../../models/project';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './task-create.html',
  styleUrls: ['./task-create.css'],
})
export class TaskCreate implements OnInit, OnDestroy, HasUnsavedChanges {
  /** Formulaire reactif de creation de tache */
  form: FormGroup;
  /** Message d'erreur */
  errorMessage = '';
  /** Indicateur de soumission en cours */
  loading = false;
  /** Indique si la creation a reussi — empeche le declenchement du guard apres sauvegarde */
  private savedSuccessfully = false;
  /** Subject de destruction pour unsubscribe propre */
  private readonly destroy$ = new Subject<void>();

  /** Liste des projets actifs (pour le selecteur) */
  projects: ProjectDTO[] = [];
  /** Liste des taches du projet selectionne (pour le selecteur de tache parente) */
  parentTasks: TaskDTO[] = [];

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private projectService: ProjectService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
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

  /** Charge les projets actifs et pre-selectionne le projet et la tache parente si queryParams presents */
  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const presetProjectId = Number(qp.get('projectId'));
    const presetParentId = Number(qp.get('parentTaskId'));

    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = (data ?? []).filter((p) => p.active !== false);
        if (presetProjectId > 0) {
          this.form.patchValue({ projectId: presetProjectId });
          // valueChanges will fire loadParentTasks; set parentTaskId after tasks load
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });

    // Reload parent tasks whenever the selected project changes
    this.form
      .get('projectId')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((pid) => {
        this.form.patchValue({ parentTaskId: null }, { emitEvent: false });
        this.parentTasks = [];
        if (pid) this.loadParentTasks(pid, presetParentId > 0 ? presetParentId : undefined);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Charge les taches actives du projet donne pour le selecteur de tache parente */
  private loadParentTasks(projectId: number, presetParentId?: number): void {
    this.taskService.getTasksByProject(projectId).subscribe({
      next: (tasks) => {
        this.parentTasks = (tasks ?? []).filter((t) => t.active !== false);
        if (presetParentId && presetParentId > 0) {
          this.form.patchValue({ parentTaskId: presetParentId }, { emitEvent: false });
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load parent tasks', err);
        this.cdr.detectChanges();
      },
    });
  }

  /** HasUnsavedChanges : retourne true si le formulaire a ete modifie sans etre sauvegarde */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  /** Valide et soumet le formulaire pour creer la tache */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const v = this.form.value;

    const payload: TaskDTO = {
      projectId: Number(v.projectId),
      parentTaskId: v.parentTaskId ? Number(v.parentTaskId) : null,

      name: String(v.name).trim(),
      description: v.description ? String(v.description).trim() : null,

      wbsNumber: v.wbsNumber ? String(v.wbsNumber).trim() : null,
      mode: v.mode ? String(v.mode).trim() : 'TASK',

      durationDays:
        v.durationDays !== null && v.durationDays !== undefined ? Number(v.durationDays) : 1.0,
      workHours:
        v.workHours !== null && v.workHours !== undefined && v.workHours !== ''
          ? Number(v.workHours)
          : null,
      sortOrder: v.sortOrder !== null && v.sortOrder !== undefined ? Number(v.sortOrder) : 0,

      startDate: v.startDate ? v.startDate : null,
      endDate: v.endDate ? v.endDate : null,

      status: v.status,
      progress: Number(v.progress),

      active: !!v.active,
    };

    this.taskService.createTask(payload).subscribe({
      next: () => {
        this.savedSuccessfully = true;
        this.router.navigate(['/tasks'], { queryParams: { projectId: v.projectId } });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage =
          typeof err?.error === 'string'
            ? err.error
            : (err?.error?.message ?? 'Error creating task');
        this.cdr.detectChanges();
      },
    });
  }
}
