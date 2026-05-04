/**
 * Composant d'affichage des details d'un projet.
 * Utilise un flux reactif (Observable) pour charger les donnees du projet
 * a partir de l'ID dans l'URL. Gere egalement la gestion des fichiers
 * associes au projet (upload et listing par sous-repertoire).
 */
import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';

import { ProjectService } from '../../services/project-service';
import { AuthService } from '../../services/auth-service';
import { FileService } from '../../services/file-service';
import { BreadcrumbService } from '../../services/breadcrumb-service';
import { ProjectDTO } from '../../models/project';

/** Type du ViewModel pour le template */
type Vm = {
  loading: boolean;
  errorMessage: string;
  projectId: number | null;
  project: ProjectDTO | null;
};

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule],
  templateUrl: './project-details.html',
  styleUrls: ['./project-details.css'],
})
export class ProjectDetails {
  /** Observable du ViewModel contenant les donnees du projet */
  vm$: Observable<Vm>;

  // --- Gestion des fichiers ---
  /** Liste des sous-repertoires disponibles pour les fichiers */
  subdirectories = ['fonctions', 'P.V', 'contrats'];
  /** Sous-repertoire actuellement selectionne */
  selectedSubdirectory = 'fonctions';
  /** Liste des fichiers du sous-repertoire selectionne */
  files: string[] = [];
  /** Message de succes apres upload */
  uploadMessage = '';
  /** Message d'erreur apres upload */
  uploadError = '';
  /** Identifiant du projet courant (pour les operations sur fichiers) */
  private currentProjectId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private fileService: FileService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
    private breadcrumbService: BreadcrumbService
  ) {
    this.vm$ = this.route.paramMap.pipe(
      map((pm) => {
        const id = Number(pm.get('id'));
        return Number.isFinite(id) && id > 0 ? id : null;
      }),
      distinctUntilChanged(),
      switchMap((projectId) => {
        if (projectId === null) {
          return of<Vm>({
            loading: false,
            errorMessage: 'Invalid project id in URL.',
            projectId: null,
            project: null,
          });
        }

        return this.projectService.getProjectById(projectId).pipe(
          map((project) => ({
            loading: false,
            errorMessage: '',
            projectId,
            project: project ?? null,
          })),
          tap((vm) => {
            if (vm.project && vm.projectId) {
              this.currentProjectId = vm.projectId;
              this.loadFiles();
              // Pousse le nom resolu pour le fil d'ariane (remplace "Project #42" par "Core Banking T24")
              this.breadcrumbService.setDynamicLabel(String(vm.projectId), vm.project.name);
            }
          }),
          startWith<Vm>({ loading: true, errorMessage: '', projectId, project: null }),
          catchError((err) => {
            console.error(err);
            const msg =
              err?.error?.message
              || (typeof err?.error === 'string' ? err.error : null)
              || (err?.status ? `Error ${err.status}: failed to load project details` : 'Error loading project details.');
            return of<Vm>({ loading: false, errorMessage: msg, projectId, project: null });
          })
        );
      }),
      shareReplay(1)
    );
  }

  /** Navigue vers la liste des taches filtree pour ce projet */
  navigateToTasks(projectId: number): void {
    this.router.navigate(['/tasks'], { queryParams: { projectId } });
  }

  /** Charge la liste des fichiers du sous-repertoire selectionne */
  loadFiles(): void {
    if (!this.currentProjectId) return;
    this.fileService.listFiles(this.currentProjectId, this.selectedSubdirectory).subscribe({
      next: (files) => {
        this.files = files;
        this.cdr.detectChanges();
      },
      error: () => {
        this.files = [];
        this.cdr.detectChanges();
      },
    });
  }

  /** Gere le changement de sous-repertoire et recharge les fichiers */
  onSubdirectoryChange(): void {
    this.uploadMessage = '';
    this.uploadError = '';
    this.loadFiles();
  }

  /** Gere la selection et l'upload d'un fichier */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.currentProjectId) return;

    const file = input.files[0];
    this.uploadMessage = '';
    this.uploadError = '';

    this.fileService.uploadFile(this.currentProjectId, this.selectedSubdirectory, file).subscribe({
      next: (res) => {
        this.uploadMessage = `File "${res.filename}" uploaded successfully.`;
        this.loadFiles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadError = err?.error?.error || 'Failed to upload file.';
        this.cdr.detectChanges();
      },
    });

    input.value = '';
  }
}