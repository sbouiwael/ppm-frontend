/**
 * DTO retourne par GET /api/capacity.
 * Represente la capacite et la charge de travail d'un utilisateur actif.
 *
 * Logique Microsoft PPM — Resource Capacity Planning :
 *   Compare les heures affectees (totalAssignedHours) contre la capacite
 *   hebdomadaire (weeklyCapacity) pour identifier les ressources surchargees.
 */
export interface ResourceCapacityDTO {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  weeklyCapacity: number;
  totalAssignedHours: number;

  /**
   * Taux d'utilisation en pourcentage.
   * Formule : (totalAssignedHours / weeklyCapacity) * 100
   */
  utilizationPct: number;

  /**
   * Statut de capacite :
   * OVERLOADED | BALANCED | UNDERUTILIZED | NO_CAPACITY
   */
  capacityStatus: string;
}
