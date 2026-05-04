/**
 * Service de gestion des affectations de taches (task assignments).
 * Permet d'affecter des utilisateurs a des taches, de modifier les heures
 * assignees et de desactiver une affectation.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TaskAssignmentDTO } from '../models/task-assignment';
import { MyTaskDTO } from '../models/my-task';

@Injectable({ providedIn: 'root' })
export class TaskAssignmentService {
  /** URL de base de l'API affectations */
  private readonly baseUrl = `${environment.apiUrl}/assignments`;

  constructor(private http: HttpClient) {}

  /** Recupere toutes les affectations pour une tache donnee */
  getByTask(taskId: number): Observable<TaskAssignmentDTO[]> {
    return this.http.get<TaskAssignmentDTO[]>(`${this.baseUrl}/task/${taskId}`);
  }

  /** Recupere toutes les affectations d'un utilisateur donne */
  getByUser(userId: number): Observable<TaskAssignmentDTO[]> {
    return this.http.get<TaskAssignmentDTO[]>(`${this.baseUrl}/user/${userId}`);
  }

  /** Cree une nouvelle affectation utilisateur/tache */
  create(dto: TaskAssignmentDTO): Observable<TaskAssignmentDTO> {
    return this.http.post<TaskAssignmentDTO>(this.baseUrl, dto);
  }

  /** Met a jour le nombre d'heures assignees pour une affectation */
  updateHours(assignmentId: number, hours: number): Observable<TaskAssignmentDTO> {
    return this.http.put<TaskAssignmentDTO>(`${this.baseUrl}/${assignmentId}/hours/${hours}`, {});
  }

  /** Desactive (suppression logique) une affectation */
  deactivate(assignmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${assignmentId}`);
  }

  /**
   * Retourne les taches affectees a l'utilisateur authentifie (GET /api/assignments/me).
   * L'userId est resolu cote backend via le SecurityContext JWT — aucun parametre n'est passe.
   * Logique Microsoft PPM : "My Tasks" — vue personnelle du contributeur.
   */
  getMyTasks(): Observable<MyTaskDTO[]> {
    return this.http.get<MyTaskDTO[]>(`${this.baseUrl}/me`);
  }
}
