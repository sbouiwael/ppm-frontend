/**
 * Modeles de transfert de donnees (DTO) pour les calendriers de travail.
 * Definissent la structure des calendriers, leurs jours de travail,
 * les heures par jour et les exceptions (jours feries, jours speciaux).
 */

/** Interface representant une exception de calendrier (jour ferie, jour special) */
export interface CalendarExceptionDTO {
  /** Identifiant unique de l'exception */
  id?: number;
  /** Identifiant du calendrier parent */
  calendarId: number;
  /** Date de l'exception au format YYYY-MM-DD */
  date: string;
  /** Nom/description de l'exception (ex: "Jour de l'An") */
  name: string;
  /** Indique si ce jour est travaille ou non */
  working: boolean;
  /** Nombre d'heures de travail pour ce jour specifique */
  workHours: number;
}

/** Interface representant un calendrier de travail complet */
export interface WorkCalendarDTO {
  /** Identifiant unique du calendrier */
  id: number;
  /** Nom du calendrier */
  name: string;
  /** Description optionnelle */
  description?: string;
  /** Nombre d'heures de travail par jour */
  workHoursPerDay: number;
  /** Jours de travail (ex: "1,2,3,4,5" pour lundi a vendredi) */
  workDays: string;
  /** Liste des exceptions du calendrier */
  exceptions: CalendarExceptionDTO[];
}

/** Interface de requete pour la creation d'un calendrier de travail */
export interface WorkCalendarCreateDTO {
  /** Nom du calendrier (requis) */
  name: string;
  /** Description optionnelle */
  description?: string;
  /** Heures de travail par jour (optionnel) */
  workHoursPerDay?: number;
  /** Jours de travail (optionnel) */
  workDays?: string;
}
