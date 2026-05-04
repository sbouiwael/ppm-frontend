/**
 * Modele de transfert de donnees (DTO) pour une affectation de tache.
 * Represente l'assignation d'un utilisateur a une tache avec un nombre
 * d'heures allouees.
 */
export interface TaskAssignmentDTO {
  /** Identifiant unique de l'affectation (absent lors de la creation) */
  id?: number;
  /** Identifiant de la tache concernee */
  taskId: number;
  /** Identifiant de l'utilisateur assigne */
  userId: number;
  /** Nom complet de l'utilisateur (rempli par le backend en lecture) */
  userName?: string;
  /** Nombre d'heures assignees a cet utilisateur pour cette tache */
  assignedHours: number;

  /** Indique si l'affectation est active */
  active?: boolean;
  /** Date de creation de l'affectation */
  createdAt?: string;
}
