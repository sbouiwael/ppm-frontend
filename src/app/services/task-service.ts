/**
 * Service de gestion des taches.
 * Fournit les methodes CRUD pour interagir avec l'API REST des taches.
 * Permet de creer, lister (par projet), recuperer, modifier et desactiver des taches.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TaskDTO } from '../models/task';

@Injectable({ providedIn: 'root' })
export class TaskService {
  /** URL de base de l'API taches */
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  /** Cree une nouvelle tache */
  createTask(dto: TaskDTO): Observable<TaskDTO> {
    return this.http.post<TaskDTO>(this.baseUrl, dto);
  }

  /** Recupere toutes les taches d'un projet donne */
  getTasksByProject(projectId: number): Observable<TaskDTO[]> {
    return this.http.get<TaskDTO[]>(`${this.baseUrl}/project/${projectId}`);
  }

  /** Recupere une tache par son identifiant */
  getTaskById(id: number): Observable<TaskDTO> {
    return this.http.get<TaskDTO>(`${this.baseUrl}/${id}`);
  }

  /** Met a jour une tache existante */
  updateTask(id: number, dto: TaskDTO): Observable<TaskDTO> {
    return this.http.put<TaskDTO>(`${this.baseUrl}/${id}`, dto);
  }

  /** Active ou desactive une tache */
  setTaskActive(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/active?active=${active}`, null);
  }

  /** Suppression physique d'une tache (cascade dependances, affectations) */
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Mise a jour rapide du statut uniquement — "Quick Actions" de My Tasks.
   * Appelle PATCH /api/tasks/{id}/status avec { "status": "IN_PROGRESS" }.
   */
  patchTaskStatus(id: number, status: string): Observable<TaskDTO> {
    return this.http.patch<TaskDTO>(`${this.baseUrl}/${id}/status`, { status });
  }

  /**
   * Mise a jour operationnelle restreinte — DEV / QA / DEVOPS.
   * Seuls status, progress et actualWorkHours sont modifiables via cet endpoint.
   * Appelle PATCH /api/tasks/{id}/operational.
   */
  patchOperational(
    id: number,
    payload: { status?: string; progress?: number; actualWorkHours?: number | null },
  ): Observable<TaskDTO> {
    return this.http.patch<TaskDTO>(`${this.baseUrl}/${id}/operational`, payload);
  }
}
