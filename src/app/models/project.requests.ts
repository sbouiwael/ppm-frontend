/**
 * Modeles de requetes pour la creation et la mise a jour de projets.
 * Ces interfaces definissent la structure des donnees envoyees au backend.
 */

/** Interface de requete pour la creation d'un nouveau projet */
export interface CreateProjectRequest {
  /** Nom du projet (requis) */
  name: string;
  /** Description du projet */
  description?: string | null;

  /** Date de debut au format YYYY-MM-DD (requis) */
  startDate: string;
  /** Date de fin au format YYYY-MM-DD */
  endDate?: string | null;

  /** Statut actif du projet (par defaut true) */
  active?: boolean;
  /** Identifiant du chef de projet (requis) */
  projectManagerId: number;

  // --- Champs optionnels supplementaires ---
  /** Nom du portefeuille */
  portfolioName?: string | null;
  /** Nom du programme */
  programName?: string | null;
  /** Nom du sous-programme */
  subProgramName?: string | null;
  /** Objectif du projet */
  objective?: string | null;
  /** Nom du calendrier */
  calendarName?: string | null;

  /** Date de debut de reference (baseline) au format YYYY-MM-DD */
  baselineStartDate?: string | null;
  /** Date de fin de reference (baseline) au format YYYY-MM-DD */
  baselineEndDate?: string | null;

  /** Progression en pourcentage (0 a 100) */
  progress?: number | null;
  /** Identifiant du calendrier de travail */
  calendarId?: number | null;
}

/** Interface de requete pour la mise a jour d'un projet (tous les champs sont optionnels) */
export type UpdateProjectRequest = Partial<CreateProjectRequest>;
