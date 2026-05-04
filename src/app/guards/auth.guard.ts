/**
 * Guard d'authentification — barriere simple "es-tu connecte ?".
 *
 * PATTERN Angular 17+ : CanActivateFn (fonction, pas de classe).
 *   L'injection de dependances se fait avec inject() a l'interieur de la fonction.
 *   Avantage : pas de boilerplate de classe, testable avec un simple spy sur AuthService.
 *
 * UTILISATION dans app.routes.ts :
 *   { path: 'dashboard', component: ..., canActivate: [authGuard] }
 *
 * CE QUE CE GUARD NE FAIT PAS : verifier le role.
 *   Pour les routes qui necessitent un role specifique, utiliser roleGuard().
 *   Lire ensuite : guards/role.guard.ts
 *
 * FLUX :
 *   Requete de navigation → Angular appelle authGuard()
 *     → isLoggedIn (BehaviorSubject.value !== null) → true  → acces autorise
 *     → isLoggedIn === false → navigateByUrl('/login') → false → navigation annulee
 *
 * FICHIER SUIVANT A LIRE : guards/role.guard.ts
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // auth.isLoggedIn lit la valeur courante du BehaviorSubject (synchrone, pas de subscribe)
  if (auth.isLoggedIn) {
    return true;
  }

  // Pas de token en memoire → rediriger vers la page de connexion
  router.navigateByUrl('/login');
  return false;
};
