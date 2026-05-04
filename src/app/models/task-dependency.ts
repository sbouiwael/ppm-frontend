/**
 * Modeles de transfert de donnees (DTO) pour les dependances entre taches.
 * Les types de dependances suivent la norme de gestion de projet :
 * FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish).
 */

/** Types de dependance possibles entre deux taches */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/** Interface representant une dependance entre deux taches */
export interface TaskDependencyDTO {
  /** Identifiant unique de la dependance */
  id?: number;
  /** Identifiant de la tache predecesseur */
  predecessorTaskId: number;
  /** Nom de la tache predecesseur (rempli par le backend en lecture) */
  predecessorTaskName?: string;
  /** Identifiant de la tache successeur */
  successorTaskId: number;
  /** Nom de la tache successeur (rempli par le backend en lecture) */
  successorTaskName?: string;
  /** Type de dependance (FS par defaut) */
  type?: DependencyType;
  /** Date de creation */
  createdAt?: string;
}

/** Interface de requete pour la creation d'une dependance */
export interface TaskDependencyCreateRequest {
  /** Identifiant de la tache predecesseur */
  predecessorTaskId: number;
  /** Identifiant de la tache successeur */
  successorTaskId: number;
  /** Type de dependance (optionnel, FS par defaut) */
  type?: DependencyType;
}
