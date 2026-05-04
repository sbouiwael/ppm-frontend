/**
 * Service de gestion des utilisateurs.
 * Fournit les methodes CRUD pour interagir avec l'API REST des utilisateurs.
 * Permet de lister, rechercher (par id ou email), creer, modifier et desactiver des utilisateurs.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserDTO } from '../models/user';

/** Type pour la creation d'un utilisateur (UserDTO + mot de passe) */
export type CreateUserPayload = UserDTO & { password: string };

/** Type pour la mise a jour d'un utilisateur (tous les champs sont optionnels) */
export type UpdateUserPayload = Partial<CreateUserPayload>;

@Injectable({ providedIn: 'root' })
export class UserService {
  /** URL de base de l'API utilisateurs */
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /** Recupere la liste de tous les utilisateurs */
  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(this.baseUrl);
  }

  /** Recupere un utilisateur par son identifiant */
  getUserById(id: number): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/${id}`);
  }

  /** Recherche un utilisateur par son adresse email */
  getUserByEmail(email: string): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/email/${encodeURIComponent(email)}`);
  }

  /**
   * Cree un nouvel utilisateur.
   * Le backend renvoie User (avec ou sans password selon la config) => any pour eviter les conflits de type.
   */
  createUser(payload: CreateUserPayload): Observable<any> {
    return this.http.post<any>(this.baseUrl, payload);
  }

  /** Met a jour un utilisateur existant */
  updateUser(id: number, payload: UpdateUserPayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
  }

  /** Active ou desactive un utilisateur */
  setUserActive(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/active?active=${active}`, null);
  }

  /** Suppression physique d'un utilisateur */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
