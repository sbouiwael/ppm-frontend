/**
 * Modeles et constantes pour le diagramme de Gantt.
 * Definit les interfaces de configuration, les rectangles de barres,
 * les fleches de dependances, l'echelle de temps, les lignes de grille
 * et l'extension GanttTask qui enrichit TaskDTO avec les donnees de rendu.
 */
import { TaskDTO, TaskStatus } from '../../models/task';
import { DependencyType } from '../../models/task-dependency';

/** Niveaux de zoom disponibles : jour, semaine, mois */
export type ZoomLevel = 'day' | 'week' | 'month';

/** Configuration d'un niveau de zoom */
export interface ZoomConfig {
  /** Nombre de pixels par jour a ce niveau de zoom */
  pixelsPerDay: number;
  /** Type de label pour l'en-tete superieur */
  topLabel: 'months' | 'years';
  /** Type de label pour l'en-tete inferieur */
  bottomLabel: 'days' | 'weeks' | 'months';
}

/** Configuration des niveaux de zoom */
export const ZOOM_CONFIGS: Record<ZoomLevel, ZoomConfig> = {
  day: { pixelsPerDay: 36, topLabel: 'months', bottomLabel: 'days' },
  week: { pixelsPerDay: 12, topLabel: 'months', bottomLabel: 'weeks' },
  month: { pixelsPerDay: 3, topLabel: 'years', bottomLabel: 'months' },
};

// --- Constantes de dimensions (en pixels) ---
/** Hauteur d'une ligne du diagramme */
export const ROW_HEIGHT = 36;
/** Hauteur d'une barre normale */
export const BAR_HEIGHT = 22;
/** Decalage vertical de la barre dans la ligne */
export const BAR_Y_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;
/** Hauteur d'une barre recapitulative (summary) */
export const SUMMARY_HEIGHT = 10;
/** Taille du losange de jalon (milestone) */
export const MILESTONE_SIZE = 12;
/** Indentation en pixels par niveau de hierarchie */
export const INDENT_PX = 20;

/** Configuration de la timeline (plage de dates, zoom, dimensions totales) */
export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  zoom: ZoomLevel;
  pixelsPerDay: number;
  totalWidth: number;
  totalHeight: number;
}

/** Rectangle representant une barre du diagramme de Gantt */
export interface BarRect {
  taskId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Largeur de la partie progression */
  progressWidth: number;
  status: TaskStatus;
  name: string;
  rowIndex: number;
  /** Indique si c'est une barre recapitulative (tache parente) */
  isSummary: boolean;
  /** Indique si c'est un jalon (duree zero) */
  isMilestone: boolean;
  /** Indique si la tache est sur le chemin critique */
  isCritical: boolean;
  /** Indique si la tache a une baseline */
  hasBaseline: boolean;
  /** Position X de la baseline */
  baselineX: number;
  /** Largeur de la baseline */
  baselineWidth: number;
}

/** Fleche representant une dependance entre deux taches */
export interface ArrowPath {
  id: number;
  /** Chemin SVG de la fleche */
  path: string;
  /** Type de dependance (FS, SS, FF, SF) */
  type: DependencyType;
}

/** Cellule d'en-tete de l'echelle de temps */
export interface HeaderCell {
  label: string;
  x: number;
  width: number;
  /** Indique si ce jour est un week-end (pour le surlignage) */
  isWeekend?: boolean;
}

/** Lignes d'en-tete de l'echelle de temps (superieur et inferieur) */
export interface TimescaleRow {
  top: HeaderCell[];
  bottom: HeaderCell[];
}

/** Ligne verticale de la grille */
export interface GridLine {
  x: number;
  isWeekend: boolean;
  /** Indique si c'est une ligne majeure (premier du mois) */
  isMajor: boolean;
}

/**
 * Extension de TaskDTO avec les donnees specifiques au rendu Gantt :
 * barre, enfants, niveau hierarchique, indicateurs de type, chemin critique, etc.
 */
export interface GanttTask extends TaskDTO {
  /** Rectangle de la barre calculee */
  bar?: BarRect;
  /** Taches enfants (sous-taches) */
  children?: GanttTask[];
  /** Indique si la tache parente est developpee */
  isExpanded?: boolean;
  /** Niveau de profondeur dans la hierarchie */
  level?: number;
  /** Indique si c'est une tache recapitulative (a des enfants) */
  isSummary?: boolean;
  /** Indique si c'est un jalon */
  isMilestone?: boolean;
  /** Indique si la tache est sur le chemin critique */
  isCritical?: boolean;
  /** Index dans la liste aplatie */
  flatIndex?: number;
  /** Label des predecesseurs (ex: "2FS, 5SS") */
  predecessorsLabel?: string;
  /** Date de debut calculee pour les taches recapitulatives (min des enfants) */
  summaryStart?: string | null;
  /** Date de fin calculee pour les taches recapitulatives (max des enfants) */
  summaryEnd?: string | null;
}
