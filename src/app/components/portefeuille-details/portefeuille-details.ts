/**
 * Composant d'affichage et d'edition des details d'un portefeuille.
 * Permet de :
 * - Modifier le nom et la description du portefeuille (edition en ligne)
 * - Ajouter un projet existant non assigne au portefeuille
 * - Retirer un projet du portefeuille
 * - Creer un nouveau projet dans ce portefeuille (redirige vers le formulaire centralise)
 */
import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PortefeuilleService } from '../../services/portefeuille-service';
import { AuthService } from '../../services/auth-service';
import { BreadcrumbService } from '../../services/breadcrumb-service';
import { PortefeuilleDTO } from '../../models/portefeuille';
import { ProjectDTO } from '../../models/project';

@Component({
  selector: 'app-portefeuille-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './portefeuille-details.html',
  styleUrls: ['./portefeuille-details.css'],
})
export class PortefeuilleDetails implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  portefeuille: PortefeuilleDTO | null = null;
  loading = true;
  errorMessage = '';
  portefeuilleId: number | null = null;

  // --- Edition en ligne du nom/description ---
  editing = false;
  editNom = '';
  editDescription = '';

  // --- Ajout de projet existant ---
  unassignedProjects: ProjectDTO[] = [];
  selectedProjectId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private portefeuilleService: PortefeuilleService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
    private breadcrumbService: BreadcrumbService
  ) {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.portefeuilleId = idParam ? Number(idParam) : null;

    if (this.portefeuilleId && this.portefeuilleId > 0) {
      this.loadPortefeuille();
      this.loadUnassignedProjects();
    } else {
      this.loading = false;
      this.errorMessage = 'Invalid portfolio id in URL.';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPortefeuille(): void {
    if (!this.portefeuilleId) return;
    this.loading = true;
    this.portefeuilleService.getById(this.portefeuilleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.portefeuille = data;
        this.loading = false;
        if (data && this.portefeuilleId) {
          this.breadcrumbService.setDynamicLabel(String(this.portefeuilleId), data.nom);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message
          || (typeof err?.error === 'string' ? err.error : null)
          || (err?.status ? `Error ${err.status}: failed to load portfolio details` : 'Error loading portfolio details.');
        this.cdr.detectChanges();
      },
    });
  }

  loadUnassignedProjects(): void {
    this.portefeuilleService.getUnassignedProjects().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => { this.unassignedProjects = data; this.cdr.detectChanges(); },
      error: () => { this.unassignedProjects = []; },
    });
  }

  startEditing(): void {
    if (!this.portefeuille) return;
    this.editing = true;
    this.editNom = this.portefeuille.nom;
    this.editDescription = this.portefeuille.description || '';
  }

  cancelEditing(): void {
    this.editing = false;
  }

  saveEditing(): void {
    if (!this.portefeuilleId || !this.editNom.trim()) return;
    this.portefeuilleService.update(this.portefeuilleId, {
      nom: this.editNom.trim(),
      description: this.editDescription.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.portefeuille = updated;
        this.editing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Error updating portfolio';
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  addProject(): void {
    if (!this.portefeuilleId || !this.selectedProjectId) return;
    this.portefeuilleService.addProject(this.portefeuilleId, this.selectedProjectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.portefeuille = updated;
        this.selectedProjectId = null;
        this.loadUnassignedProjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Error adding project to portfolio';
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  removeProject(projectId: number): void {
    if (!this.portefeuilleId) return;
    this.portefeuilleService.removeProject(this.portefeuilleId, projectId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.portefeuille = updated;
        this.loadUnassignedProjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Error removing project from portfolio';
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Navigue vers le formulaire centralise de creation de projet, pre-rempli avec ce portefeuille */
  navigateToCreateProject(): void {
    this.router.navigate(['/projects/new'], {
      queryParams: {
        portefeuilleId: this.portefeuilleId,
        returnTo: `/portefeuilles/${this.portefeuilleId}`,
      },
    });
  }
}
