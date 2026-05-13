/**
 * Modeles pour le tableau de bord executif portefeuille (Wave 2).
 * Correspond au backend PortfolioDashboardDTO et ses records imbriques.
 */

export type HealthStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';

export interface ProjectHealthSummary {
  id: number;
  name: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  baselineEndDate: string | null;
  isActive: boolean;
  healthStatus: HealthStatus;
  managerId: number | null;
  portfolioId: number | null;
  portfolioName: string | null;
  taskCount: number;
}

export interface PortfolioSummary {
  id: number;
  name: string;
  projectCount: number;
  activeProjectCount: number;
  delayedProjectCount: number;
  completedProjectCount: number;
  avgProgress: number;
}

export interface PortfolioDashboardDTO {
  totalPortfolios: number;
  totalActiveProjects: number;
  delayedProjectsCount: number;
  completedProjectsCount: number;
  onTrackProjectsCount: number;
  atRiskProjectsCount: number;
  averageProgress: number;
  totalActiveTasks: number;
  overdueTasks: number;
  tasksByStatus: Record<string, number>;
  totalActiveUsers: number;
  usersByRole: Record<string, number>;
  projectHealthOverview: ProjectHealthSummary[];
  portfolioSummaries: PortfolioSummary[];
}
