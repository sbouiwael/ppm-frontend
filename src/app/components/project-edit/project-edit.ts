/**
 * Composant d'edition d'un projet existant.
 * Charge les donnees du projet et les listes de reference en parallele (forkJoin),
 * pre-remplit le formulaire, et gere le reassignement de portefeuille si necessaire.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { ProjectService } from '../../services/project-service';
import { UserService } from '../../services/user-service';
import { PortefeuilleService } from '../../services/portefeuille-service';
import { CalendarService } from '../../services/calendar-service';
import { ProjectDTO } from '../../models/project';
import { UserDTO } from '../../models/user';
import { PortefeuilleDTO } from '../../models/portefeuille';
import { WorkCalendarDTO } from '../../models/calendar';
import { UpdateProjectRequest } from '../../models/project.requests';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './project-edit.html',
  styleUrls: ['./project-edit.css'],
})
export class ProjectEdit implements OnInit, HasUnsavedChanges {
  /** Liste des utilisateurs actifs */
  users: UserDTO[] = [];
  /** Liste des portefeuilles */
  portefeuilles: PortefeuilleDTO[] = [];
  /** Liste des calendriers */
  calendars: WorkCalendarDTO[] = [];
  /** Indicateur de soumission en cours */
  loading = false;
  /** Indicateur de chargement initial des donnees */
  loadingData = true;
  /** Message d'erreur */
  errorMsg = '';
  /** Formulaire reactif d'edition */
  form: FormGroup;
  /** Identifiant du projet en cours d'edition */
  projectId!: number;

  /** Donnees du projet chargees (pour comparer l'ancien portefeuille) */
  private projectData: ProjectDTO | null = null;
  /** Indique si la modification a reussi — empeche le declenchement du guard apres sauvegarde */
  private savedSuccessfully = false;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private userService: UserService,
    private portefeuilleService: PortefeuilleService,
    private calendarService: CalendarService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
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

  /**
   * Charge en parallele les utilisateurs, le projet, les portefeuilles et les calendriers.
   * Pre-remplit le formulaire avec les valeurs du projet existant.
   */
  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      users: this.userService.getAllUsers(),
      project: this.projectService.getProjectById(this.projectId),
      portefeuilles: this.portefeuilleService.getAll(),
      calendars: this.calendarService.getAll(),
    }).subscribe({
      next: ({ users, project, portefeuilles, calendars }) => {
        this.users = (users ?? []).filter((u) => u.active !== false);
        this.portefeuilles = portefeuilles ?? [];
        this.calendars = calendars ?? [];
        this.projectData = project;

        // Set loadingData=false FIRST so the template renders the form + <select> options
        this.loadingData = false;
        this.cdr.detectChanges();

        // NOW patch values — the <select> options exist so Angular can match projectManagerId
        this.form.patchValue({
          name: project.name,
          description: project.description ?? '',
          startDate: project.startDate,
          endDate: project.endDate ?? '',
          projectManagerId: project.projectManagerId,
          active: project.active,
          portefeuilleId: project.portefeuilleId ?? null,
          programName: project.programName ?? '',
          subProgramName: project.subProgramName ?? '',
          objective: project.objective ?? '',
          calendarId: project.calendarId ?? null,
          baselineStartDate: project.baselineStartDate ?? '',
          baselineEndDate: project.baselineEndDate ?? '',
          progress: project.progress ?? 0,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loadingData = false;
        this.errorMsg = 'Error loading project data';
        this.cdr.detectChanges();
      },
    });
  }

  /** HasUnsavedChanges : retourne true si le formulaire a ete modifie sans etre sauvegarde */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  /** Valide et soumet le formulaire de mise a jour du projet */
  submit(): void {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const v = this.form.value;

    const newPfId = v.portefeuilleId ? Number(v.portefeuilleId) : null;
    const oldPfId = this.projectData?.portefeuilleId ?? null;
    const selectedPf = this.portefeuilles.find(pf => pf.id === newPfId);

    const payload: UpdateProjectRequest = {
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

    this.projectService.updateProject(this.projectId, payload).subscribe({
      next: () => {
        this.savedSuccessfully = true; // Marque comme sauvegarde avant la navigation
        // Portfolio FK changed — reassign
        if (newPfId !== oldPfId) {
          this.reassignPortfolio(oldPfId, newPfId);
        } else {
          this.router.navigateByUrl('/projects');
        }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMsg =
          typeof err?.error === 'string'
            ? err.error
            : (err?.error?.message ?? 'Update failed');
      },
    });
  }

  /**
   * Gere le reassignement de portefeuille quand il change.
   * Retire le projet de l'ancien portefeuille puis l'ajoute au nouveau.
   */
  private reassignPortfolio(oldPfId: number | null, newPfId: number | null): void {
    const done = () => this.router.navigateByUrl('/projects');

    if (oldPfId) {
      // Remove from old portfolio first
      this.portefeuilleService.removeProject(oldPfId, this.projectId).subscribe({
        next: () => {
          if (newPfId) {
            this.portefeuilleService.addProject(newPfId, this.projectId).subscribe({
              next: done, error: done,
            });
          } else {
            done();
          }
        },
        error: () => {
          // Old removal failed (maybe already unassigned), try adding to new anyway
          if (newPfId) {
            this.portefeuilleService.addProject(newPfId, this.projectId).subscribe({
              next: done, error: done,
            });
          } else {
            done();
          }
        },
      });
    } else if (newPfId) {
      // No old portfolio, just add to new
      this.portefeuilleService.addProject(newPfId, this.projectId).subscribe({
        next: done, error: done,
      });
    } else {
      done();
    }
  }
}
