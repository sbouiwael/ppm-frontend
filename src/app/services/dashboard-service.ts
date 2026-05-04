/**
 * Service du tableau de bord (dashboard).
 * Recupere les donnees agregees depuis l'API pour alimenter les graphiques
 * et statistiques de la page d'accueil : totaux, repartition par statut,
 * par role, statistiques projets/portefeuilles et charge de travail.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PortfolioDashboardDTO } from '../models/portfolio-dashboard';

/** Interface regroupant toutes les donnees du tableau de bord */
export interface DashboardData {
  /** Nombre total de portefeuilles */
  totalPortfolios: number;
  /** Nombre total de projets */
  totalProjects: number;
  /** Nombre de projets actifs */
  totalActiveProjects: number;
  /** Nombre de projets inactifs */
  totalInactiveProjects: number;
  /** Nombre total de taches */
  totalTasks: number;
  /** Nombre total d'utilisateurs */
  totalUsers: number;
  /** Nombre d'utilisateurs actifs */
  totalActiveUsers: number;
  /** Repartition des taches par statut (ex: NOT_STARTED, IN_PROGRESS, DONE, BLOCKED) */
  tasksByStatus: Record<string, number>;
  /** Repartition des utilisateurs par role */
  usersByRole: Record<string, number>;
  /** Statistiques detaillees par projet */
  projectStats: {
    id: number; name: string; progress: number;
    startDate: string; endDate: string; baselineEndDate: string;
    active: boolean; taskCount: number; managerId: number;
  }[];
  /** Statistiques par portefeuille (nombre de projets, progression moyenne) */
  portfolioStats: {
    id: number; name: string; projectCount: number; avgProgress: number;
  }[];
  /** Charge de travail par utilisateur (capacite vs heures assignees) */
  workload: {
    userId: number; firstName: string; lastName: string;
    role: string; weeklyCapacity: number; totalAssignedHours: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  /** Recupere toutes les donnees du tableau de bord depuis l'API */
  getData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${environment.apiUrl}/dashboard`);
  }

  /** Recupere le tableau de bord executif portefeuille (Wave 2) */
  getPortfolioDashboard(): Observable<PortfolioDashboardDTO> {
    return this.http.get<PortfolioDashboardDTO>(`${environment.apiUrl}/dashboard/portfolio`);
  }
}
