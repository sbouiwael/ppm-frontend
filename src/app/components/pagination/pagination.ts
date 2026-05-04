/**
 * Composant reutilisable de pagination.
 * Genere une liste de pages avec ellipses (...) pour les grandes listes,
 * et emet un evenement lors du changement de page.
 * Utilise dans les listes de projets, taches, utilisateurs et portefeuilles.
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.css'],
})
export class Pagination {
  /** Nombre total d'elements a paginer */
  @Input() totalItems = 0;
  /** Nombre d'elements par page */
  @Input() pageSize = 6;
  /** Numero de la page courante */
  @Input() currentPage = 1;
  /** Evenement emis lors du changement de page */
  @Output() pageChange = new EventEmitter<number>();

  /** Calcule le nombre total de pages */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  /**
   * Genere la liste des numeros de pages a afficher.
   * Utilise -1 pour representer les ellipses (...).
   * Affiche au maximum 7 elements (avec ellipses si necessaire).
   */
  get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1); // ellipsis
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push(-1); // ellipsis
      pages.push(total);
    }

    return pages;
  }

  /** Navigue vers une page donnee (si valide et differente de la page courante) */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  /** Navigue vers la premiere page */
  goFirst(): void { this.goToPage(1); }
  /** Navigue vers la page precedente */
  goPrev(): void { this.goToPage(this.currentPage - 1); }
  /** Navigue vers la page suivante */
  goNext(): void { this.goToPage(this.currentPage + 1); }
  /** Navigue vers la derniere page */
  goLast(): void { this.goToPage(this.totalPages); }
}
