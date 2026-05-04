/**
 * Service de gestion des fichiers associes aux projets.
 * Permet de telecharger (upload) des fichiers dans un sous-repertoire
 * d'un projet et de lister les fichiers existants.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FileService {
  /** URL de base de l'API projets (les fichiers sont un sous-endpoint des projets) */
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  /**
   * Telecharge un fichier vers un sous-repertoire d'un projet.
   * Utilise un FormData pour l'envoi multipart.
   */
  uploadFile(projectId: number, subdirectory: string, file: File): Observable<{ filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subdirectory', subdirectory);
    return this.http.post<{ filename: string }>(`${this.baseUrl}/${projectId}/files`, formData);
  }

  /** Liste les fichiers d'un sous-repertoire d'un projet */
  listFiles(projectId: number, subdirectory: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${projectId}/files`, {
      params: { subdirectory }
    });
  }
}
