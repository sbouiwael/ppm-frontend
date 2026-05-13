/**
 * Service d'authentification JWT.
 * Gere la connexion, la deconnexion, le stockage du token en localStorage,
 * et expose l'etat de l'utilisateur connecte (observable et synchrone).
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/** Interface pour la requete de connexion (email + mot de passe) */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Interface representant l'utilisateur authentifie avec son token JWT */
export interface AuthUser {
  token: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/** Cle utilisee pour stocker les donnees d'authentification dans le localStorage */
const STORAGE_KEY = 'ppm_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** URL de base de l'API d'authentification */
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** BehaviorSubject contenant l'utilisateur connecte (null si deconnecte) */
  private currentUser$ = new BehaviorSubject<AuthUser | null>(this.loadFromStorage());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  /** Observable de l'utilisateur authentifie (null si non connecte) */
  get user$(): Observable<AuthUser | null> {
    return this.currentUser$.asObservable();
  }

  /** Acces synchrone a l'utilisateur courant */
  get currentUser(): AuthUser | null {
    return this.currentUser$.value;
  }

  /** Indique si un utilisateur est actuellement connecte */
  get isLoggedIn(): boolean {
    return this.currentUser$.value !== null;
  }

  /** Retourne le token JWT de l'utilisateur connecte, ou null */
  get token(): string | null {
    return this.currentUser$.value?.token ?? null;
  }

  /** Retourne le role de l'utilisateur connecte, ou null */
  get role(): string | null {
    return this.currentUser$.value?.role ?? null;
  }

  /** Retourne l'identifiant de l'utilisateur connecte, ou null */
  get userId(): number | null {
    return this.currentUser$.value?.userId ?? null;
  }

  /**
   * Envoie une requete de connexion au backend.
   * En cas de succes, stocke les donnees utilisateur dans le localStorage
   * et met a jour le BehaviorSubject.
   */
  login(req: LoginRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/login`, req).pipe(
      tap((user) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        this.currentUser$.next(user);
      }),
    );
  }

  /** Deconnecte l'utilisateur : supprime le localStorage et redirige vers /login */
  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUser$.next(null);
    this.router.navigateByUrl('/login');
  }

  /** Verifie si le role de l'utilisateur est dans la liste des roles autorises */
  hasRole(...roles: string[]): boolean {
    const r = this.role;
    return r !== null && roles.includes(r);
  }

  /**
   * Verifie le token aupres du backend (utilise a l'initialisation de l'application).
   * Rafraichit les donnees locales tout en conservant le token existant.
   */
  verifyToken(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        // Rafraichir les donnees locales avec la reponse serveur mais garder le token
        const stored = this.currentUser;
        if (stored) {
          const updated = { ...user, token: stored.token };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          this.currentUser$.next(updated);
        }
      }),
    );
  }

  /**
   * Charge les donnees d'authentification depuis le localStorage.
   * Retourne null si aucune donnee n'est presente ou si le parsing echoue.
   */
  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
