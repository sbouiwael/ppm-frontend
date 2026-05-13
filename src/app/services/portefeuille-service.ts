/**
 * Service de gestion des portefeuilles de projets.
 * Fournit les methodes CRUD pour les portefeuilles, ainsi que
 * l'ajout/retrait de projets dans un portefeuille et la recuperation
 * des projets non assignes a un portefeuille.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PortefeuilleDTO, PortefeuilleCreateUpdateRequest } from '../models/portefeuille';
import { ProjectDTO } from '../models/project';

@Injectable({ providedIn: 'root' })
export class PortefeuilleService {
  /** URL de base de l'API portefeuilles */
  private readonly baseUrl = `${environment.apiUrl}/portefeuilles`;

  constructor(private http: HttpClient) {}

  /** Recupere la liste de tous les portefeuilles */
  getAll(): Observable<PortefeuilleDTO[]> {
    return this.http.get<PortefeuilleDTO[]>(this.baseUrl);
  }

  /** Recupere un portefeuille par son identifiant */
  getById(id: number): Observable<PortefeuilleDTO> {
    return this.http.get<PortefeuilleDTO>(`${this.baseUrl}/${id}`);
  }

  /** Cree un nouveau portefeuille */
  create(payload: PortefeuilleCreateUpdateRequest): Observable<PortefeuilleDTO> {
    return this.http.post<PortefeuilleDTO>(this.baseUrl, payload);
  }

  /** Met a jour un portefeuille existant */
  update(id: number, payload: PortefeuilleCreateUpdateRequest): Observable<PortefeuilleDTO> {
    return this.http.put<PortefeuilleDTO>(`${this.baseUrl}/${id}`, payload);
  }

  /** Supprime un portefeuille */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Ajoute un projet existant a un portefeuille */
  addProject(portefeuilleId: number, projectId: number): Observable<PortefeuilleDTO> {
    return this.http.post<PortefeuilleDTO>(
      `${this.baseUrl}/${portefeuilleId}/projects/${projectId}`,
      {},
    );
  }

  /** Retire un projet d'un portefeuille */
  removeProject(portefeuilleId: number, projectId: number): Observable<PortefeuilleDTO> {
    return this.http.delete<PortefeuilleDTO>(
      `${this.baseUrl}/${portefeuilleId}/projects/${projectId}`,
    );
  }

  /** Recupere les projets qui ne sont assignes a aucun portefeuille */
  getUnassignedProjects(): Observable<ProjectDTO[]> {
    return this.http.get<ProjectDTO[]>(`${this.baseUrl}/unassigned-projects`);
  }
}
