/**
 * Fichier de configuration principale de l'application Angular.
 * Enregistre les providers globaux :
 * - Ecouteurs d'erreurs navigateur
 * - Routeur avec les routes definies dans app.routes.ts
 * - Client HTTP avec l'intercepteur d'authentification JWT
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    /** Capture les erreurs globales du navigateur */
    provideBrowserGlobalErrorListeners(),
    /** Fournit le routeur avec toutes les routes de l'application */
    provideRouter(routes),
    /** Fournit le client HTTP avec l'intercepteur qui attache le token JWT */
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
