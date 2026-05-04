/**
 * Modele de transfert de donnees (DTO) pour un utilisateur.
 * Definit les roles possibles et les proprietes d'un utilisateur
 * telles que renvoyees par l'API backend.
 */

/** Types de roles possibles dans l'application */
export type Role = 'PM' | 'PMO' | 'DEV' | 'QA' | 'DEVOPS' | 'RH' | 'ADMIN' | string;

/** Interface representant un utilisateur */
export interface UserDTO {
  /** Identifiant unique (absent lors de la creation) */
  id?: number;
  /** Prenom de l'utilisateur */
  firstName: string;
  /** Nom de famille de l'utilisateur */
  lastName: string;
  /** Adresse email (sert aussi d'identifiant de connexion) */
  email: string;
  /** Role de l'utilisateur dans l'application */
  role: Role;
  /** Capacite hebdomadaire en heures de travail */
  weeklyCapacity: number;

  /** Indique si l'utilisateur est actif */
  active?: boolean;
  /** Date de creation du compte */
  createdAt?: string;
}
