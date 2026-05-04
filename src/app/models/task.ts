/**
 * Modele de transfert de donnees (DTO) pour une tache.
 * Definit le statut possible d'une tache et tous ses champs
 * tels que renvoyes par l'API backend.
 */

/** Types de statut possibles pour une tache */
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

/** Interface representant une tache */
export interface TaskDTO {
  /** Identifiant unique de la tache (absent lors de la creation) */
  id?: number;

  /** Nom de la tache */
  name: string;
  /** Description optionnelle */
  description?: string | null;

  /** Identifiant du projet auquel appartient la tache */
  projectId: number;
  /** Identifiant de la tache parente (null si tache racine) */
  parentTaskId?: number | null;

  // --- Champs alignes avec le backend ---
  /** Numero WBS (Work Breakdown Structure) */
  wbsNumber?: string | null;
  /** Mode de la tache (ex: TASK, MILESTONE) */
  mode?: string | null;

  /** Duree en jours */
  durationDays?: number | null;
  /** Heures de travail estimees */
  workHours?: number | null;

  /** Duree de reference (baseline) en jours */
  baselineDurationDays?: number | null;
  /** Date de debut de reference (baseline) au format YYYY-MM-DD */
  baselineStartDate?: string | null;
  /** Date de fin de reference (baseline) au format YYYY-MM-DD */
  baselineEndDate?: string | null;

  /** Heures de travail reellement effectuees */
  actualWorkHours?: number | null;
  /** Nom du calendrier de travail associe */
  calendarName?: string | null;

  /** Ordre de tri pour l'affichage */
  sortOrder?: number | null;

  /** Date de debut au format YYYY-MM-DD */
  startDate?: string | null;
  /** Date de fin au format YYYY-MM-DD */
  endDate?: string | null;

  /** Statut actuel de la tache */
  status?: TaskStatus | null;
  /** Progression en pourcentage (0 a 100) */
  progress?: number | null;

  /** Indique si la tache est active */
  active?: boolean;
  /** Date de creation */
  createdAt?: string;

  // Champs de lisibilite — remplis par le backend en lecture, null en creation/modification
  /** Nom du projet (pour affichage en detail) */
  projectName?: string | null;
  /** Nom de la tache parente (pour affichage en detail, null si tache racine) */
  parentTaskName?: string | null;

  /**
   * IDs des utilisateurs ACTIFS affectes a cette tache.
   * Rempli uniquement par GET /api/tasks/{id} (vue detail).
   * null dans la vue liste (non charge pour eviter le N+1).
   * Utilise pour afficher le nombre d'assignes et lier vers la page d'affectations.
   */
  assignedUserIds?: number[] | null;

  /**
   * Indique si cette tache a des sous-taches actives.
   * Calcule par le backend (non stocke en base).
   * Utilise pour l'affichage UX : badge "Summary", verrouillage du progress direct.
   */
  hasChildren?: boolean;
}