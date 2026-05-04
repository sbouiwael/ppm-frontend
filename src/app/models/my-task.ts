/**
 * DTO retourne par GET /api/assignments/me.
 * Represente une tache affectee a l'utilisateur authentifie,
 * enrichie avec les informations du projet parent.
 *
 * Logique Microsoft PPM : "My Tasks" — espace de travail personnel du contributeur.
 * Seules les affectations actives sur des taches actives sont incluses.
 */
export interface MyTaskDTO {
  /** Identifiant de l'affectation */
  assignmentId: number;

  /** Identifiant de la tache */
  taskId: number;

  /** Nom de la tache */
  taskName: string;

  /** Statut de la tache : NOT_STARTED | IN_PROGRESS | DONE | BLOCKED */
  taskStatus: string;

  /** Progression en pourcentage (0-100) */
  taskProgress: number;

  /** Date de debut prevue (YYYY-MM-DD, peut etre null) */
  startDate: string | null;

  /** Date de fin prevue (YYYY-MM-DD, peut etre null) */
  endDate: string | null;

  /** Numero WBS de la tache (ex: "1.2.3") */
  wbsNumber: string | null;

  /** Heures assignees a cet utilisateur sur cette tache */
  assignedHours: number;

  /** Identifiant du projet parent */
  projectId: number;

  /** Nom du projet parent (pour navigation et filtre) */
  projectName: string;

  /** Duree prevue en jours */
  durationDays: number | null;

  /** Heures de travail totales prevues sur la tache */
  workHours: number | null;
}
