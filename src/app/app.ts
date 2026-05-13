/**
 * Composant racine de l'application Angular (PPM Front).
 * Gere l'affichage de la barre de navigation (navbar) en fonction du role
 * de l'utilisateur connecte, ainsi que la deconnexion et le menu burger.
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, AuthUser } from './services/auth-service';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb';
import { NotificationBell } from './components/notification-bell/notification-bell';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BreadcrumbComponent,
    NotificationBell,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  /** Titre de l'application (signal reactif) */
  protected readonly title = signal('ppm_front');

  /** Indique si le menu mobile (burger) est ouvert */
  protected menuOpen = false;

  constructor(public auth: AuthService) {}

  /**
   * Verifie la validite du token JWT stocke en localStorage au demarrage.
   * Si le token est invalide ou expire, deconnecte l'utilisateur automatiquement.
   */
  ngOnInit(): void {
    if (this.auth.isLoggedIn) {
      this.auth.verifyToken().subscribe({
        error: () => this.auth.logout(),
      });
    }
  }

  /** Retourne l'utilisateur actuellement connecte, ou null */
  get user(): AuthUser | null {
    return this.auth.currentUser;
  }

  /** Verifie si un utilisateur est connecte */
  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn;
  }

  /** Verifie si l'utilisateur possede l'un des roles passes en parametre */
  hasRole(...roles: string[]): boolean {
    return this.auth.hasRole(...roles);
  }

  /** Deconnecte l'utilisateur et ferme le menu mobile */
  logout(): void {
    this.menuOpen = false;
    this.auth.logout();
  }
}
