/**
 * Composant de creation d'un nouveau projet.
 * Affiche un formulaire reactif avec tous les champs du projet.
 * Charge les listes de reference (utilisateurs, portefeuilles, calendriers)
 * et associe le projet au portefeuille selectionne apres creation.
 *
 * Contexte prefill :
 *   - queryParam portefeuilleId : pre-selectionne le portefeuille (ex: depuis portefeuille-details)
 *   - queryParam returnTo       : URL de retour apres creation (ex: /portefeuilles/3)
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { ProjectService } from '../../services/project-service';
import { UserService } from '../../services/user-service';
import { PortefeuilleService } from '../../services/portefeuille-service';
import { CalendarService } from '../../services/calendar-service';
import { UserDTO } from '../../models/user';
import { PortefeuilleDTO } from '../../models/portefeuille';
import { WorkCalendarDTO } from '../../models/calendar';
import { CreateProjectRequest } from '../../models/project.requests';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './project-create.html',
  styleUrls: ['./project-create.css'],
})
export class ProjectCreate implements OnInit, OnDestroy, HasUnsavedChanges {
  users: UserDTO[] = [];
  portefeuilles: PortefeuilleDTO[] = [];
  calendars: WorkCalendarDTO[] = [];
  loading = false;
  errorMsg = '';
  form: FormGroup;
  /** URL de retour apres creation (depuis queryParam returnTo) */
  returnToUrl = '/projects';
  private readonly destroy$ = new Subject<void>();
  private savedSuccessfully = false;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private userService: UserService,
    private portefeuilleService: PortefeuilleService,
    private calendarService: CalendarService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      startDate: ['', Validators.required],
      endDate: [''],
      projectManagerId: [null, [Validators.required, Validators.min(1)]],
      active: [true],
      portefeuilleId: [null],
      programName: [''],
      subProgramName: [''],
      objective: [''],
      calendarId: [null],
      baselineStartDate: [''],
      baselineEndDate: [''],
      progress: [0, [Validators.min(0), Validators.max(100)]],
    });
  }

  ngOnInit(): void {
    // Lit les queryParams de contexte avant de charger les donnees de reference
    const qp = this.route.snapshot.queryParamMap;
    const prefillPortefeuilleId = qp.get('portefeuilleId')
      ? Number(qp.get('portefeuilleId'))
      : null;
    const returnTo = qp.get('returnTo');
    if (returnTo) {
      this.returnToUrl = returnTo;
    }

    forkJoin({
      users: this.userService.getAllUsers(),
      portefeuilles: this.portefeuilleService.getAll(),
      calendars: this.calendarService.getAll(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ users, portefeuilles, calendars }) => {
          this.users = (users ?? []).filter((u) => u.active !== false);
          this.portefeuilles = portefeuilles ?? [];
          this.calendars = calendars ?? [];

          // Pre-selectionne le portefeuille si fourni en queryParam
          if (
            prefillPortefeuilleId &&
            this.portefeuilles.some((pf) => pf.id === prefillPortefeuilleId)
          ) {
            this.form.patchValue({ portefeuilleId: prefillPortefeuilleId });
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.errorMsg = 'Cannot load reference data';
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  submit(): void {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const v = this.form.value;
    const selectedPfId = v.portefeuilleId ? Number(v.portefeuilleId) : null;
    const selectedPf = this.portefeuilles.find((pf) => pf.id === selectedPfId);

    const payload: CreateProjectRequest = {
      name: String(v.name).trim(),
      description: v.description ? String(v.description).trim() : null,
      startDate: v.startDate,
      endDate: v.endDate ? v.endDate : null,
      projectManagerId: Number(v.projectManagerId),
      active: !!v.active,
      portfolioName: selectedPf ? selectedPf.nom : null,
      programName: v.programName ? String(v.programName).trim() : null,
      subProgramName: v.subProgramName ? String(v.subProgramName).trim() : null,
      objective: v.objective ? String(v.objective).trim() : null,
      calendarId: v.calendarId ? Number(v.calendarId) : null,
      baselineStartDate: v.baselineStartDate ? v.baselineStartDate : null,
      baselineEndDate: v.baselineEndDate ? v.baselineEndDate : null,
      progress: v.progress !== null && v.progress !== undefined ? Number(v.progress) : null,
    };

    this.projectService.createProject(payload).subscribe({
      next: (created) => {
        this.savedSuccessfully = true;
        if (selectedPfId) {
          this.portefeuilleService.addProject(selectedPfId, created.id).subscribe({
            next: () => this.router.navigateByUrl(this.returnToUrl),
            error: () => this.router.navigateByUrl(this.returnToUrl),
          });
        } else {
          this.router.navigateByUrl(this.returnToUrl);
        }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg =
          typeof err?.error === 'string' ? err.error : (err?.error?.message ?? 'Create failed');
        this.cdr.detectChanges();
      },
    });
  }
}
