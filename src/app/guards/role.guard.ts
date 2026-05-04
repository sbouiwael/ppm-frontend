/**
 * Guard de role — factory qui retourne un CanActivateFn parametrise.
 *
 * PATTERN "factory de guard" :
 *   roleGuard('ADMIN') est un appel de fonction qui RETOURNE une CanActivateFn.
 *   Angular appelle cette CanActivateFn au moment de la navigation.
 *   Les roles autorises sont captures dans la closure — pas besoin de les passer autrement.
 *
 * UTILISATION dans app.routes.ts :
 *   { path: 'admin', canActivate: [roleGuard('ADMIN')] }
 *   { path: 'projects', canActivate: [roleGuard('ADMIN', 'PMO', 'PM')] }
 *
 * POURQUOI deux guards differents (authGuard + roleGuard) ?
 *   roleGuard contient deja le check isLoggedIn (etape 1), donc on n'a pas besoin
 *   d'enchaîner authGuard + roleGuard sur la meme route. Un seul roleGuard suffit.
 *   authGuard est utilise pour les routes accessibles a tous les roles (ex: dashboard).
 *
 * REDIRECTIONS :
 *   Pas connecte    → /login   (utilisateur ne sait meme pas si la page existe)
 *   Connecte + role insuffisant → /  (utilisateur sait qu'il n'a pas acces, va a l'accueil)
 *
 * CONTRE-PARTIE BACKEND :
 *   Ce guard est une barriere UX. Le backend enforce les memes regles avec
 *   @PreAuthorize("hasRole('ADMIN')") — meme si le guard est bypasse, l'API refusera.
 *   Lire : config/SecurityConfig.java et les controllers avec @PreAuthorize.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  // La fonction retournee est la vraie CanActivateFn — inject() est appele ici (pas dans la factory)
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // Etape 1 : verification de l'authentification
    if (!auth.isLoggedIn) {
      router.navigateByUrl('/login');
      return false;
    }

    // Etape 2 : verification du role
    // hasRole() compare auth.role (string) avec la liste allowedRoles
    if (auth.hasRole(...allowedRoles)) {
      return true;
    }

    // Connecte mais role insuffisant → accueil (pas logout)
    router.navigateByUrl('/');
    return false;
  };
}
