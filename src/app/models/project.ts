/**
 * Modele de transfert de donnees (DTO) pour un projet.
 * Correspond a la representation d'un projet telle que renvoyee par l'API backend.
 */
export interface ProjectDTO {
  /** Identifiant unique du projet */
  id: number;

  /** Nom du projet */
  name: string;
  /** Description optionnelle du projet */
  description?: string | null;

  /** Date de debut du projet (format YYYY-MM-DD, requis cote backend) */
  startDate: string;
  /** Date de fin du projet (optionnelle) */
  endDate?: string | null;

  /** Indique si le projet est actif */
  active: boolean;
  /** Identifiant du chef de projet (manager) */
  projectManagerId: number;
  /** Nom complet du chef de projet (pour affichage) */
  projectManagerName?: string | null;

  // --- Champs optionnels supplementaires ---

  /** Nom du portefeuille auquel appartient le projet */
  portfolioName?: string | null;
  /** Nom du programme */
  programName?: string | null;
  /** Nom du sous-programme */
  subProgramName?: string | null;
  /** Objectif du projet */
  objective?: string | null;
  /** Nom du calendrier de travail associe */
  calendarName?: string | null;

  /** Date de debut de reference (baseline) */
  baselineStartDate?: string | null;
  /** Date de fin de reference (baseline) */
  baselineEndDate?: string | null;

  /** Progression du projet en pourcentage (0 a 100) */
  progress?: number | null;

  /** Identifiant du portefeuille associe */
  portefeuilleId?: number | null;
  /** Identifiant du calendrier de travail associe */
  calendarId?: number | null;
}