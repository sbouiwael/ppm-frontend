/**
 * Composant fil d'ariane (breadcrumb).
 * S'abonne au BreadcrumbService et affiche le chemin de navigation courant.
 * Les elements parents sont cliquables ; le dernier element est non-cliquable.
 * N'est pas affiche sur la page de login.
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { BreadcrumbService, BreadcrumbItem } from '../../services/breadcrumb-service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.html',
  styleUrls: ['./breadcrumb.css'],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  /** Fil d'ariane courant */
  items: BreadcrumbItem[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private breadcrumbService: BreadcrumbService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.items$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => { this.items = items; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** N'affiche le breadcrumb que si l'utilisateur est connecte et qu'il y a au moins 2 elements */
  get shouldShow(): boolean {
    return this.auth.isLoggedIn && this.items.length > 1;
  }
}