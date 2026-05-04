/**
 * Service d'acces au journal d'audit (Wave 2).
 * Appelle les endpoints REST /api/audit/* du backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditLogDTO, AuditSearchParams, PageResponse } from '../models/audit-log';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly baseUrl = `${environment.apiUrl}/audit`;

  constructor(private http: HttpClient) {}

  /**
   * Recherche paginee multi-criteres dans le journal d'audit.
   * Tous les parametres sont optionnels.
   */
  search(params: AuditSearchParams): Observable<PageResponse<AuditLogDTO>> {
    let p = new HttpParams();
    if (params.entityType)            p = p.set('entityType', params.entityType);
    if (params.actorId != null)       p = p.set('actorId',    params.actorId.toString());
    if (params.action)                p = p.set('action',     params.action);
    if (params.from)                  p = p.set('from',       params.from + 'T00:00:00');
    if (params.to)                    p = p.set('to',         params.to   + 'T23:59:59');
    if (params.page != null)          p = p.set('page',       params.page.toString());
    if (params.size != null)          p = p.set('size',       params.size.toString());
    return this.http.get<PageResponse<AuditLogDTO>>(this.baseUrl, { params: p });
  }

  /** Historique d'une entite specifique */
  getByEntity(entityType: string, entityId: number): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.baseUrl}/entity/${entityType}/${entityId}`);
  }

  /** Toutes les entrees d'audit liees a un projet */
  getByProject(projectId: number): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.baseUrl}/project/${projectId}`);
  }

  /** Historique des actions d'un acteur (ADMIN uniquement) */
  getByActor(actorId: number): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.baseUrl}/actor/${actorId}`);
  }
}