/**
 * Composant journal d'audit (Wave 2).
 * Tableau paginee cote serveur avec filtres multi-criteres.
 * RBAC : ADMIN, PMO, PM.
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuditService } from '../../services/audit.service';
import {
  AuditLogDTO,
  AuditAction,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  PageResponse,
} from '../../models/audit-log';
import { Pagination } from '../pagination/pagination';

@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './audit-log-list.html',
  styleUrl: './audit-log-list.css',
})
export class AuditLogList implements OnInit, OnDestroy {
  /** Entrees de la page courante */
  entries: AuditLogDTO[] = [];
  loading = false;
  errorMessage = '';

  // Filtres
  filterEntityType = '';
  filterAction: AuditAction | '' = '';
  filterFrom = '';
  filterTo = '';

  // Pagination cote serveur
  currentPage = 1; // 1-based (Angular), converti en 0-based pour Spring
  pageSize = 20;
  totalElements = 0;

  readonly entityTypes = AUDIT_ENTITY_TYPES;
  readonly actions = AUDIT_ACTIONS;

  /** ID de l'entree dont le detail est affiche (null = aucune) */
  expandedId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private auditService: AuditService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auditService
      .search({
        entityType: this.filterEntityType || undefined,
        action: (this.filterAction as AuditAction) || undefined,
        from: this.filterFrom || undefined,
        to: this.filterTo || undefined,
        page: this.currentPage - 1, // Spring est 0-based
        size: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: PageResponse<AuditLogDTO>) => {
          this.entries = page.content ?? [];
          this.totalElements = page.totalElements ?? 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = `Erreur ${err.status} — impossible de charger le journal d'audit.`;
          this.cdr.detectChanges();
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  resetFilters(): void {
    this.filterEntityType = '';
    this.filterAction = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.load();
  }

  /** Classe CSS du badge selon l'action */
  actionBadgeClass(action: AuditAction): string {
    switch (action) {
      case 'CREATE':
        return 'badge-success';
      case 'UPDATE':
        return 'badge-info';
      case 'DELETE':
        return 'badge-error';
      case 'STATUS_CHANGE':
        return 'badge-warning';
      case 'ASSIGN':
        return 'badge-primary';
      case 'UNASSIGN':
        return 'badge-neutral';
      case 'DEPENDENCY_ADD':
        return 'badge-primary';
      case 'DEPENDENCY_REMOVE':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  }

  /** Libelle lisible de l'action */
  actionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      CREATE: 'Create',
      UPDATE: 'Update',
      DELETE: 'Delete',
      STATUS_CHANGE: 'Status Change',
      ASSIGN: 'Assign',
      UNASSIGN: 'Unassign',
      DEPENDENCY_ADD: 'Dep Add',
      DEPENDENCY_REMOVE: 'Dep Remove',
    };
    return labels[action] ?? action;
  }

  // ── Audit Detail View (Wave 3) ────────────────────────────────────────────

  /**
   * Bascule l'affichage du detail pour une entree.
   * Un clic sur la meme entree ferme le detail (toggle).
   * Un clic sur une autre entree ferme le detail precedent et ouvre le nouveau.
   */
  toggleDetail(entry: AuditLogDTO): void {
    this.expandedId = this.expandedId === entry.id ? null : entry.id;
  }

  /** Formate un timestamp ISO en date + heure locale */
  formatTs(ts: string): string {
    if (!ts) return '—';
    const d = new Date(ts);
    return (
      d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    );
  }
}
