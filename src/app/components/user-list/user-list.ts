/**
 * Composant de la liste des utilisateurs.
 * Affiche les utilisateurs sous forme de cartes avec recherche, tri, pagination
 * et confirmation de suppression.
 * Les permissions d'ecriture sont limitees aux roles ADMIN et RH.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth-service';
import { UserDTO } from '../../models/user';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { Pagination } from '../pagination/pagination';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmDialog, Pagination],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.css'],
})
export class UserListComponent implements OnInit {
  /** Liste des utilisateurs charges depuis l'API */
  users: UserDTO[] = [];
  /** Indicateur de chargement */
  loading = false;
  /** Message d'erreur */
  errorMessage = '';

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
  /** Utilisateur cible pour la suppression */
  deleteTarget: UserDTO | null = null;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public auth: AuthService
  ) {}

  /** Indique si l'utilisateur a les droits d'ecriture (creation/edition/suppression) */
  get canWrite(): boolean { return this.auth.hasRole('ADMIN','RH'); }

  /** Initialisation : charge la liste des utilisateurs */
  ngOnInit(): void {
    this.loadUsers();
  }

  /** Retourne les utilisateurs filtres par le terme de recherche et tries */
  get filteredUsers(): UserDTO[] {
    let result = this.users;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(u =>
        (u.firstName?.toLowerCase().includes(term)) ||
        (u.lastName?.toLowerCase().includes(term)) ||
        ((u.firstName + ' ' + u.lastName).toLowerCase().includes(term)) ||
        (u.email?.toLowerCase().includes(term)) ||
        (u.role?.toLowerCase().includes(term)) ||
        (u.weeklyCapacity?.toString().includes(term)) ||
        (u.createdAt?.includes(term)) ||
        (u.active !== false ? 'active' : 'inactive').includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      switch (this.sortBy) {
        case 'name-asc': return (a.firstName + ' ' + a.lastName).localeCompare(b.firstName + ' ' + b.lastName);
        case 'name-desc': return (b.firstName + ' ' + b.lastName).localeCompare(a.firstName + ' ' + a.lastName);
        case 'role': return (a.role || '').localeCompare(b.role || '');
        case 'capacity-desc': return (b.weeklyCapacity ?? 0) - (a.weeklyCapacity ?? 0);
        case 'capacity-asc': return (a.weeklyCapacity ?? 0) - (b.weeklyCapacity ?? 0);
        case 'active-first': return (b.active !== false ? 1 : 0) - (a.active !== false ? 1 : 0);
        case 'inactive-first': return (a.active !== false ? 1 : 0) - (b.active !== false ? 1 : 0);
        default: return 0;
      }
    });

    return result;
  }

  get paginatedUsers(): UserDTO[] {
    const filtered = this.filteredUsers;
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  get totalFiltered(): number {
    return this.filteredUsers.length;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  /** Charge la liste des utilisateurs depuis l'API */
  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.users = [];

    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = Array.isArray(data) ? data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.users = [];
        this.errorMessage =
          err?.error?.message
          || (typeof err?.error === 'string' ? err.error : null)
          || `Error ${err.status}: failed to load users`;
        this.cdr.detectChanges();
      },
    });
  }

  toggleActive(user: UserDTO, event: Event): void {
    event.stopPropagation();
    if (!user.id) return;
    const newActive = !user.active;
    this.userService.setUserActive(user.id, newActive).subscribe({
      next: () => this.loadUsers(),
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || err?.error || 'Error updating user status';
        this.cdr.detectChanges();
      },
    });
  }

  onEdit(user: UserDTO, event: Event): void {
    event.stopPropagation();
    if (user.id) {
      this.router.navigate(['/users', user.id, 'edit']);
    }
  }

  // Double-click to edit
  onCardDblClick(user: UserDTO): void {
    if (user.id) {
      this.router.navigate(['/users', user.id, 'edit']);
    }
  }

  // Delete with confirmation
  askDelete(user: UserDTO, event: Event): void {
    event.stopPropagation();
    this.deleteTarget = user;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) return;
    this.userService.deleteUser(this.deleteTarget.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
        this.loadUsers();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || err?.error || 'Error deleting user';
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
