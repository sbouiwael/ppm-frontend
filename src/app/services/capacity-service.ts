import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResourceCapacityDTO } from '../models/resource-capacity';
import { WeeklyCapacityDTO } from '../models/weekly-capacity';
import { AssignmentCapacityCheckDTO } from '../models/assignment-capacity-check';

@Injectable({ providedIn: 'root' })
export class CapacityService {
  private readonly baseUrl = `${environment.apiUrl}/capacity`;

  constructor(private http: HttpClient) {}

  getCapacityOverview(role?: string, projectId?: number): Observable<ResourceCapacityDTO[]> {
    let params = new HttpParams();
    if (role)      params = params.set('role', role);
    if (projectId) params = params.set('projectId', projectId.toString());
    return this.http.get<ResourceCapacityDTO[]>(this.baseUrl, { params });
  }

  getWeeklyCapacity(weeks = 12, role?: string): Observable<WeeklyCapacityDTO[]> {
    let params = new HttpParams().set('weeks', weeks.toString());
    if (role) params = params.set('role', role);
    return this.http.get<WeeklyCapacityDTO[]>(`${this.baseUrl}/weekly`, { params });
  }

  /**
   * Pre-assignment capacity check.
   * Returns a week-by-week breakdown of the capacity impact of assigning
   * {@code assignedHours} to {@code userId} on {@code taskId}.
   */
  checkAssignment(userId: number, taskId: number, assignedHours: number): Observable<AssignmentCapacityCheckDTO> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('taskId', taskId.toString())
      .set('assignedHours', assignedHours.toString());
    return this.http.get<AssignmentCapacityCheckDTO>(`${this.baseUrl}/check-assignment`, { params });
  }
}
