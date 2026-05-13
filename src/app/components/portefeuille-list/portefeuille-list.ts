/**
 * Composant de la liste des portefeuilles.
 * Affiche les portefeuilles sous forme de cartes avec recherche, tri, pagination,
 * creation en ligne (inline) et confirmation de suppression.
 * Les permissions d'ecriture sont limitees aux roles ADMIN et PMO.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { PortefeuilleService } from '../../services/portefeuille-service';
import { AuthService } from '../../services/auth-service';
import { PortefeuilleDTO, PortefeuilleCreateUpdateRequest } from '../../models/portefeuille';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { Pagination } from '../pagination/pagination';

@Component({
  selector: 'app-portefeuille-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmDialog, Pagination],
  templateUrl: './portefeuille-list.html',
  styleUrls: ['./portefeuille-list.css'],
})
export class PortefeuilleList implements OnInit {
  /** Liste des portefeuilles charges depuis l'API */
  portefeuilles: PortefeuilleDTO[] = [];
  /** Indicateur de chargement */
  loading = false;
  /** Message d'erreur */
  errorMessage = '';

  // --- Formulaire de creation en ligne ---
  /** Affiche ou masque le formulaire de creation */
  showCreateForm = false;
  /** Nom du nouveau portefeuille */
  newNom = '';
  /** Description du nouveau portefeuille */
  newDescription = '';
  /** Indicateur de creation en cours */
  creating = false;

  // --- Recherche et tri ---
  /** Terme de recherche */
  searchTerm = '';
  /** Critere de tri */
  sortBy = 'name-asc';

  // --- Pagination ---
  /** Page courante */
  currentPage = 1;
  /** Nombre d'elements par page */
  pageSize = 6;

  // --- Confirmation de suppression ---
  /** Affiche ou masque le dialogue de confirmation */
  showDeleteConfirm = false;
  /** Portefeuille cible pour la suppression */
  deleteTarget: PortefeuilleDTO | null = null;

  constructor(
    private portefeuilleService: PortefeuilleService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public auth: AuthService,
  ) {}

  /** Indique si l'utilisateur a les droits d'ecriture */
  get canWrite(): boolean {
    return this.auth.hasRole('ADMIN', 'PMO');
  }

  /** Initialisation : charge la liste des portefeuilles */
  ngOnInit(): void {
    this.loadPortefeuilles();
  }

  /** Retourne les portefeuilles filtres et tries */
  get filteredPortefeuilles(): PortefeuilleDTO[] {
    let result = this.portefeuilles;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (pf) =>
          pf.nom?.toLowerCase().includes(term) ||
          pf.description?.toLowerCase().includes(term) ||
          pf.projects.length.toString().includes(term),
      );
    }

    result = [...result].sort((a, b) => {
      switch (this.sortBy) {
        case 'name-asc':
          return (a.nom || '').localeCompare(b.nom || '');
        case 'name-desc':
          return (b.nom || '').localeCompare(a.nom || '');
        case 'projects-desc':
          return b.projects.length - a.projects.length;
        case 'projects-asc':
          return a.projects.length - b.projects.length;
        default:
          return 0;
      }
    });

    return result;
  }

  get paginatedPortefeuilles(): PortefeuilleDTO[] {
    const filtered = this.filteredPortefeuilles;
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  get totalFiltered(): number {
    return this.filteredPortefeuilles.length;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  /** Charge les portefeuilles depuis l'API */
  loadPortefeuilles(): void {
    this.loading = true;
    this.errorMessage = '';
    this.portefeuilles = [];

    this.portefeuilleService.getAll().subscribe({
      next: (data) => {
        this.portefeuilles = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.portefeuilles = [];
        this.errorMessage =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : null) ||
          `Error ${err.status}: failed to load portfolios`;
        this.cdr.detectChanges();
      },
    });
  }

  /** Affiche/masque le formulaire de creation en ligne */
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.newNom = '';
      this.newDescription = '';
    }
  }

  /** Cree un nouveau portefeuille via l'API */
  createPortefeuille(): void {
    if (!this.newNom.trim()) return;

    this.creating = true;
    this.errorMessage = '';
    const payload: PortefeuilleCreateUpdateRequest = {
      nom: this.newNom.trim(),
      description: this.newDescription.trim() || null,
    };

    this.portefeuilleService.create(payload).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.newNom = '';
        this.newDescription = '';
        this.loadPortefeuilles();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = 'Error creating portfolio';
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  onEdit(pf: PortefeuilleDTO, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/portefeuilles', pf.id]);
  }

  // Double-click to navigate to details (which has inline edit)
  onCardDblClick(pf: PortefeuilleDTO): void {
    this.router.navigate(['/portefeuilles', pf.id]);
  }

  // Delete with confirmation
  askDelete(pf: PortefeuilleDTO, event: Event): void {
    event.stopPropagation();
    this.deleteTarget = pf;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.portefeuilleService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
        this.loadPortefeuilles();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error deleting portfolio';
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
