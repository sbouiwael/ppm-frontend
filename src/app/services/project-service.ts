/**
 * Service de gestion des projets.
 * Fournit les methodes CRUD pour interagir avec l'API REST des projets.
 * Permet de lister, creer, modifier, supprimer (desactiver) des projets
 * et de filtrer par manager.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProjectDTO } from '../models/project';
import { CreateProjectRequest, UpdateProjectRequest } from '../models/project.requests';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  /** URL de base de l'API projets */
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  /** Recupere la liste de tous les projets */
  getAllProjects(): Observable<ProjectDTO[]> {
    return this.http.get<ProjectDTO[]>(this.baseUrl);
  }

  /** Recupere un projet par son identifiant */
  getProjectById(id: number): Observable<ProjectDTO> {
    return this.http.get<ProjectDTO>(`${this.baseUrl}/${id}`);
  }

  /** Recupere les projets geres par un manager specifique */
  getByManager(managerId: number): Observable<ProjectDTO[]> {
    return this.http.get<ProjectDTO[]>(`${this.baseUrl}/manager/${managerId}`);
  }

  /** Cree un nouveau projet */
  createProject(payload: CreateProjectRequest): Observable<ProjectDTO> {
    return this.http.post<ProjectDTO>(this.baseUrl, payload);
  }

  /** Met a jour un projet existant */
  updateProject(id: number, payload: UpdateProjectRequest): Observable<ProjectDTO> {
    return this.http.put<ProjectDTO>(`${this.baseUrl}/${id}`, payload);
  }

  /** Active ou desactive un projet */
  setProjectActive(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/active?active=${active}`, null);
  }

  /** Suppression physique d'un projet (cascade taches, dependances, affectations) */
  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}