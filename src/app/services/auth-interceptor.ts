/**
 * Intercepteur HTTP fonctionnel pour l'authentification JWT.
 * Deux responsabilites :
 * 1. Attache le token JWT (header Authorization) a chaque requete sortante (si connecte)
 * 2. Redirige vers /login en cas de reponse 401 (token expire ou invalide)
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ne pas attacher le token a la requete de connexion
  if (req.url.includes('/api/auth/login')) {
    return next(req);
  }

  // Cloner la requete et ajouter le header Authorization si un token existe
  const token = authService.token;
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        // Token expire ou invalide -> forcer la deconnexion
        authService.logout();
      }
      // 403 = role non autorise -> rester connecte, laisser le composant gerer l'erreur
      return throwError(() => error);
    })
  );
};
