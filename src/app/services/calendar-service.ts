/**
 * Service de gestion des calendriers de travail.
 * Fournit les methodes CRUD pour les calendriers, la gestion des exceptions
 * (jours feries, jours speciaux) et la recuperation des jours non travailles.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WorkCalendarDTO, WorkCalendarCreateDTO, CalendarExceptionDTO } from '../models/calendar';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  /** URL de base de l'API calendriers */
  private readonly baseUrl = `${environment.apiUrl}/calendars`;

  constructor(private http: HttpClient) {}

  /** Recupere la liste de tous les calendriers de travail */
  getAll(): Observable<WorkCalendarDTO[]> {
    return this.http.get<WorkCalendarDTO[]>(this.baseUrl);
  }

  /** Recupere un calendrier par son identifiant */
  getById(id: number): Observable<WorkCalendarDTO> {
    return this.http.get<WorkCalendarDTO>(`${this.baseUrl}/${id}`);
  }

  /** Cree un nouveau calendrier de travail */
  create(dto: WorkCalendarCreateDTO): Observable<WorkCalendarDTO> {
    return this.http.post<WorkCalendarDTO>(this.baseUrl, dto);
  }

  /** Met a jour un calendrier existant */
  update(id: number, dto: WorkCalendarCreateDTO): Observable<WorkCalendarDTO> {
    return this.http.put<WorkCalendarDTO>(`${this.baseUrl}/${id}`, dto);
  }

  /** Supprime un calendrier */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Ajoute une exception (jour ferie, jour special) a un calendrier */
  addException(calendarId: number, dto: CalendarExceptionDTO): Observable<CalendarExceptionDTO> {
    return this.http.post<CalendarExceptionDTO>(`${this.baseUrl}/${calendarId}/exceptions`, dto);
  }

  /** Recupere la liste des exceptions d'un calendrier */
  getExceptions(calendarId: number): Observable<CalendarExceptionDTO[]> {
    return this.http.get<CalendarExceptionDTO[]>(`${this.baseUrl}/${calendarId}/exceptions`);
  }

  /** Supprime une exception par son identifiant */
  removeException(exceptionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/exceptions/${exceptionId}`);
  }

  /** Recupere les jours non travailles d'un calendrier sur une periode donnee */
  getNonWorkingDays(calendarId: number, from: string, to: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${calendarId}/non-working-days`, {
      params: { from, to },
    });
  }
}
