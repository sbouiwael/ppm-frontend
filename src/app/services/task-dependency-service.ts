/**
 * Service de gestion des dependances entre taches.
 * Permet de definir les relations predecesseur/successeur entre les taches
 * (types : FS, SS, FF, SF) et de les consulter par tache ou par projet.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TaskDependencyDTO, TaskDependencyCreateRequest } from '../models/task-dependency';

@Injectable({ providedIn: 'root' })
export class TaskDependencyService {
  /** URL de base de l'API dependances */
  private readonly baseUrl = `${environment.apiUrl}/dependencies`;

  constructor(private http: HttpClient) {}

  /** Recupere les dependances dont cette tache est le successeur (ses predecesseurs) */
  getPredecessors(taskId: number): Observable<TaskDependencyDTO[]> {
    return this.http.get<TaskDependencyDTO[]>(`${this.baseUrl}/predecessors/${taskId}`);
  }

  /** Recupere les dependances dont cette tache est le predecesseur (ses successeurs) */
  getSuccessors(taskId: number): Observable<TaskDependencyDTO[]> {
    return this.http.get<TaskDependencyDTO[]>(`${this.baseUrl}/successors/${taskId}`);
  }

  /** Cree une nouvelle dependance entre deux taches */
  create(req: TaskDependencyCreateRequest): Observable<TaskDependencyDTO> {
    return this.http.post<TaskDependencyDTO>(this.baseUrl, req);
  }

  /** Supprime une dependance par son identifiant */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Recupere toutes les dependances d'un projet donne */
  getByProject(projectId: number): Observable<TaskDependencyDTO[]> {
    return this.http.get<TaskDependencyDTO[]>(`${this.baseUrl}/project/${projectId}`);
  }
}
