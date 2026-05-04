/**
 * Modeles de transfert de donnees (DTO) pour les portefeuilles de projets.
 * Un portefeuille regroupe plusieurs projets pour une gestion de haut niveau.
 */
import { ProjectDTO } from './project';

/** Interface representant un portefeuille avec ses projets */
export interface PortefeuilleDTO {
  /** Identifiant unique du portefeuille */
  id: number;
  /** Nom du portefeuille */
  nom: string;
  /** Description optionnelle */
  description?: string | null;
  /** Liste des projets contenus dans ce portefeuille */
  projects: ProjectDTO[];
}

/** Interface de requete pour la creation ou la mise a jour d'un portefeuille */
export interface PortefeuilleCreateUpdateRequest {
  /** Nom du portefeuille (requis) */
  nom: string;
  /** Description optionnelle */
  description?: string | null;
}
