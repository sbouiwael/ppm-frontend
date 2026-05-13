/**
 * Fonctions utilitaires pour le diagramme de Gantt.
 * Contient toute la logique de calcul :
 * - Manipulation de dates
 * - Construction de l'arborescence hierarchique des taches
 * - Calcul de la configuration timeline (plage de dates, pixels par jour)
 * - Calcul des barres, fleches de dependances, echelle de temps
 * - Algorithme du chemin critique (methode CPM avec passe avant/arriere)
 * - Couleurs par statut et formes SVG (jalons, barres recapitulatives)
 */
import { TaskDTO } from '../../models/task';
import { TaskDependencyDTO, DependencyType } from '../../models/task-dependency';
import {
  TimelineConfig,
  BarRect,
  ArrowPath,
  HeaderCell,
  TimescaleRow,
  GridLine,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  SUMMARY_HEIGHT,
  MILESTONE_SIZE,
  ZoomLevel,
  ZOOM_CONFIGS,
  GanttTask,
} from './gantt.models';

// ── Fonctions utilitaires de date ──

/** Calcule le nombre de jours entre deux dates */
function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

/** Retourne le debut du jour (minuit) pour une date donnee */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Ajoute N jours a une date */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Retourne le premier jour du mois */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Retourne le premier jour de l'annee */
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

/** Calcule le numero de semaine ISO d'une date */
function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Retourne le lundi de la semaine de la date donnee */
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

/** Verifie si une date tombe un week-end (samedi ou dimanche) */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// ── Construction de l'arborescence hierarchique ──

/** Construit l'arbre hierarchique des taches a partir de la liste plate */
export function buildTaskTree(flatTasks: TaskDTO[]): GanttTask[] {
  const map = new Map<number, GanttTask>();
  const roots: GanttTask[] = [];

  // First pass: create GanttTask nodes
  for (const t of flatTasks) {
    const gt: GanttTask = { ...t, children: [], isExpanded: true, level: 0 };
    if (t.id != null) map.set(t.id, gt);
  }

  // Second pass: build parent-child relationships
  for (const gt of map.values()) {
    if (gt.parentTaskId != null && map.has(gt.parentTaskId)) {
      const parent = map.get(gt.parentTaskId)!;
      parent.children!.push(gt);
    } else {
      roots.push(gt);
    }
  }

  // Third pass: mark summaries, compute levels, summary dates
  function processNode(node: GanttTask, level: number): void {
    node.level = level;
    if (node.children && node.children.length > 0) {
      node.isSummary = true;
      let minStart: string | null = null;
      let maxEnd: string | null = null;

      for (const child of node.children) {
        processNode(child, level + 1);
        // Gather child date ranges (including sub-summaries)
        const cStart = child.isSummary ? child.summaryStart : child.startDate;
        const cEnd = child.isSummary ? child.summaryEnd : child.endDate;
        if (cStart && (!minStart || cStart < minStart)) minStart = cStart;
        if (cEnd && (!maxEnd || cEnd > maxEnd)) maxEnd = cEnd;
      }
      node.summaryStart = minStart;
      node.summaryEnd = maxEnd;
    } else {
      node.isSummary = false;
    }

    // Milestone: 0-duration task with no children
    node.isMilestone =
      !node.isSummary && (node.durationDays === 0 || (node.durationDays == null && !node.endDate));
  }

  roots.forEach((r) => processNode(r, 0));
  return roots;
}

/** Flatten tree respecting expand/collapse state into visible row list */
export function flattenTree(roots: GanttTask[], collapsedIds: Set<number>): GanttTask[] {
  const result: GanttTask[] = [];

  function walk(nodes: GanttTask[]): void {
    for (const node of nodes) {
      node.flatIndex = result.length;
      result.push(node);
      if (node.children && node.children.length > 0) {
        const isExpanded = node.id != null ? !collapsedIds.has(node.id) : true;
        node.isExpanded = isExpanded;
        if (isExpanded) {
          walk(node.children);
        }
      }
    }
  }

  walk(roots);
  return result;
}

/** Build "predecessors" display label for a task, e.g. "2FS, 5SS" */
export function buildPredecessorsLabel(
  taskId: number,
  deps: TaskDependencyDTO[],
  taskIdToRow: Map<number, number>,
): string {
  const preds = deps.filter((d) => d.successorTaskId === taskId);
  if (preds.length === 0) return '';
  return preds
    .map((d) => {
      const row = taskIdToRow.get(d.predecessorTaskId);
      const rowLabel = row != null ? String(row + 1) : '?';
      const type = d.type ?? 'FS';
      return type === 'FS' ? rowLabel : `${rowLabel}${type}`;
    })
    .join(', ');
}

// ── Fonctions principales de calcul ──

/** Convertit une date en position X (pixels) sur la timeline */
export function dateToX(date: Date, config: TimelineConfig): number {
  return daysBetween(config.startDate, date) * config.pixelsPerDay;
}

/** Convertit une position X (pixels) en date */
export function xToDate(x: number, config: TimelineConfig): Date {
  const days = x / config.pixelsPerDay;
  return addDays(config.startDate, Math.round(days));
}

/** Calcule la plage de dates de la timeline (min/max des taches avec marge) */
export function computeTimelineRange(tasks: GanttTask[]): { startDate: Date; endDate: Date } {
  const today = startOfDay(new Date());
  let minDate = today;
  let maxDate = addDays(today, 30);

  for (const t of tasks) {
    const s = t.isSummary ? t.summaryStart : t.startDate;
    const e = t.isSummary ? t.summaryEnd : t.endDate;
    if (s) {
      const d = startOfDay(new Date(s));
      if (d < minDate) minDate = d;
    }
    if (e) {
      const d = startOfDay(new Date(e));
      if (d > maxDate) maxDate = d;
    }
  }

  return {
    startDate: addDays(startOfMonth(minDate), -7),
    endDate: addDays(maxDate, 14),
  };
}

/** Construit la configuration complete de la timeline (dates, zoom, dimensions) */
export function buildTimelineConfig(tasks: GanttTask[], zoom: ZoomLevel): TimelineConfig {
  const { startDate, endDate } = computeTimelineRange(tasks);
  const zoomCfg = ZOOM_CONFIGS[zoom];
  const totalDays = Math.ceil(daysBetween(startDate, endDate));
  const totalWidth = totalDays * zoomCfg.pixelsPerDay;
  const totalHeight = tasks.length * ROW_HEIGHT;

  return { startDate, endDate, zoom, pixelsPerDay: zoomCfg.pixelsPerDay, totalWidth, totalHeight };
}

/** Calcule le rectangle d'une barre de Gantt (position, taille, progression, baseline) */
export function computeBar(
  task: GanttTask,
  rowIndex: number,
  config: TimelineConfig,
): BarRect | null {
  if (!task.id) return null;

  const isSummary = !!task.isSummary;
  const startStr = isSummary ? task.summaryStart : task.startDate;
  const endStr = isSummary ? task.summaryEnd : task.endDate;

  if (!startStr) return null;

  const start = startOfDay(new Date(startStr));
  const end = endStr ? startOfDay(new Date(endStr)) : addDays(start, task.durationDays ?? 1);

  const isMilestone = !!task.isMilestone;
  const x = dateToX(start, config);
  const rawWidth = daysBetween(start, end) * config.pixelsPerDay;
  const width = isMilestone ? 0 : Math.max(rawWidth, config.pixelsPerDay);

  const barHeight = isSummary ? SUMMARY_HEIGHT : BAR_HEIGHT;
  const yOffset = isSummary ? ROW_HEIGHT / 2 - SUMMARY_HEIGHT / 2 : BAR_Y_OFFSET;
  const y = rowIndex * ROW_HEIGHT + yOffset;

  const progress = task.progress ?? 0;
  const progressWidth = isMilestone ? 0 : (width * progress) / 100;

  // Baseline
  let hasBaseline = false;
  let baselineX = 0;
  let baselineWidth = 0;
  if (task.baselineStartDate && task.baselineEndDate) {
    hasBaseline = true;
    const bStart = startOfDay(new Date(task.baselineStartDate));
    const bEnd = startOfDay(new Date(task.baselineEndDate));
    baselineX = dateToX(bStart, config);
    baselineWidth = Math.max(daysBetween(bStart, bEnd) * config.pixelsPerDay, config.pixelsPerDay);
  }

  return {
    taskId: task.id,
    x,
    y,
    width,
    height: barHeight,
    progressWidth,
    status: task.status ?? 'NOT_STARTED',
    name: task.name,
    rowIndex,
    isSummary,
    isMilestone,
    isCritical: !!task.isCritical,
    hasBaseline,
    baselineX,
    baselineWidth,
  };
}

/** Calcule le chemin SVG d'une fleche de dependance entre deux barres */
export function computeArrow(predBar: BarRect, succBar: BarRect, type: DependencyType): string {
  const midGap = 10;
  let fromX: number, fromY: number, toX: number, toY: number;

  const predMidY = predBar.y + predBar.height / 2;
  const succMidY = succBar.y + succBar.height / 2;

  switch (type) {
    case 'FS':
      fromX = predBar.isMilestone ? predBar.x + MILESTONE_SIZE / 2 : predBar.x + predBar.width;
      fromY = predMidY;
      toX = succBar.isMilestone ? succBar.x - MILESTONE_SIZE / 2 : succBar.x;
      toY = succMidY;
      break;
    case 'SS':
      fromX = predBar.isMilestone ? predBar.x - MILESTONE_SIZE / 2 : predBar.x;
      fromY = predMidY;
      toX = succBar.isMilestone ? succBar.x - MILESTONE_SIZE / 2 : succBar.x;
      toY = succMidY;
      break;
    case 'FF':
      fromX = predBar.isMilestone ? predBar.x + MILESTONE_SIZE / 2 : predBar.x + predBar.width;
      fromY = predMidY;
      toX = succBar.isMilestone ? succBar.x + MILESTONE_SIZE / 2 : succBar.x + succBar.width;
      toY = succMidY;
      break;
    case 'SF':
      fromX = predBar.isMilestone ? predBar.x - MILESTONE_SIZE / 2 : predBar.x;
      fromY = predMidY;
      toX = succBar.isMilestone ? succBar.x + MILESTONE_SIZE / 2 : succBar.x + succBar.width;
      toY = succMidY;
      break;
    default:
      fromX = predBar.x + predBar.width;
      fromY = predMidY;
      toX = succBar.x;
      toY = succMidY;
  }

  // Right-angle connector path
  if (type === 'FS' || type === 'SF') {
    if (toX > fromX + midGap) {
      const midX = fromX + midGap;
      return `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`;
    } else {
      const detourY =
        fromY < toY
          ? Math.max(predBar.y + predBar.height + 6, succBar.y + succBar.height + 6)
          : Math.min(predBar.y - 6, succBar.y - 6);
      return `M ${fromX} ${fromY} H ${fromX + midGap} V ${detourY} H ${toX - midGap} V ${toY} H ${toX}`;
    }
  } else {
    const leftX = Math.min(fromX, toX) - midGap;
    const rightX = Math.max(fromX, toX) + midGap;
    if (type === 'SS') {
      return `M ${fromX} ${fromY} H ${leftX} V ${toY} H ${toX}`;
    } else {
      return `M ${fromX} ${fromY} H ${rightX} V ${toY} H ${toX}`;
    }
  }
}

// ── Echelle de temps (timescale) ──

/** Noms des mois en anglais */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Genere l'echelle de temps avec en-tetes superieur et inferieur selon le zoom */
export function generateTimescale(config: TimelineConfig): TimescaleRow {
  const { startDate, endDate, zoom, pixelsPerDay } = config;
  const top: HeaderCell[] = [];
  const bottom: HeaderCell[] = [];

  if (zoom === 'day') {
    let cursor = startOfMonth(startDate);
    while (cursor < endDate) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const visibleStart = cursor < startDate ? startDate : cursor;
      const visibleEnd = monthEnd > endDate ? endDate : monthEnd;
      const x = dateToX(visibleStart, config);
      const w = daysBetween(visibleStart, visibleEnd) * pixelsPerDay;
      top.push({ label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`, x, width: w });
      cursor = monthEnd;
    }
    let day = new Date(startDate);
    while (day < endDate) {
      const x = dateToX(day, config);
      bottom.push({
        label: String(day.getDate()),
        x,
        width: pixelsPerDay,
        isWeekend: isWeekend(day),
      });
      day = addDays(day, 1);
    }
  } else if (zoom === 'week') {
    let cursor = startOfMonth(startDate);
    while (cursor < endDate) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const visibleStart = cursor < startDate ? startDate : cursor;
      const visibleEnd = monthEnd > endDate ? endDate : monthEnd;
      const x = dateToX(visibleStart, config);
      const w = daysBetween(visibleStart, visibleEnd) * pixelsPerDay;
      top.push({ label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`, x, width: w });
      cursor = monthEnd;
    }
    let week = startOfWeek(startDate);
    while (week < endDate) {
      const nextWeek = addDays(week, 7);
      const visibleStart = week < startDate ? startDate : week;
      const visibleEnd = nextWeek > endDate ? endDate : nextWeek;
      const x = dateToX(visibleStart, config);
      const w = daysBetween(visibleStart, visibleEnd) * pixelsPerDay;
      bottom.push({ label: `W${getISOWeek(week)}`, x, width: w });
      week = nextWeek;
    }
  } else {
    let cursor = startOfYear(startDate);
    while (cursor < endDate) {
      const yearEnd = new Date(cursor.getFullYear() + 1, 0, 1);
      const visibleStart = cursor < startDate ? startDate : cursor;
      const visibleEnd = yearEnd > endDate ? endDate : yearEnd;
      const x = dateToX(visibleStart, config);
      const w = daysBetween(visibleStart, visibleEnd) * pixelsPerDay;
      top.push({ label: String(cursor.getFullYear()), x, width: w });
      cursor = yearEnd;
    }
    let month = startOfMonth(startDate);
    while (month < endDate) {
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const visibleStart = month < startDate ? startDate : month;
      const visibleEnd = nextMonth > endDate ? endDate : nextMonth;
      const x = dateToX(visibleStart, config);
      const w = daysBetween(visibleStart, visibleEnd) * pixelsPerDay;
      bottom.push({ label: MONTH_NAMES[month.getMonth()].substring(0, 3), x, width: w });
      month = nextMonth;
    }
  }

  return { top, bottom };
}

// ── Lignes de la grille ──

/** Genere les lignes verticales de la grille (jours, mois) */
export function generateGridLines(config: TimelineConfig): GridLine[] {
  const lines: GridLine[] = [];
  let day = new Date(config.startDate);
  while (day < config.endDate) {
    const x = dateToX(day, config);
    const we = isWeekend(day);
    const isMajor = day.getDate() === 1;
    // In day zoom show all lines; in week/month only show major lines
    if (config.zoom === 'day' || isMajor) {
      lines.push({ x, isWeekend: we, isMajor });
    }
    day = addDays(day, 1);
  }
  return lines;
}

/** Retourne les plages de week-ends (position X et largeur) pour le surlignage */
export function getWeekendRanges(config: TimelineConfig): { x: number; width: number }[] {
  if (config.zoom !== 'day') return [];
  const ranges: { x: number; width: number }[] = [];
  let day = new Date(config.startDate);
  while (day < config.endDate) {
    if (isWeekend(day)) {
      ranges.push({ x: dateToX(day, config), width: config.pixelsPerDay });
    }
    day = addDays(day, 1);
  }
  return ranges;
}

// ── Chemin critique (methode CPM : passe avant/arriere simplifiee) ──

/** Noeud interne pour le calcul du chemin critique */
interface CpNode {
  id: number;
  duration: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  successors: { id: number; type: DependencyType }[];
  predecessors: { id: number; type: DependencyType }[];
}

/**
 * Calcule le chemin critique du projet.
 * Utilise l'algorithme CPM (Critical Path Method) avec :
 * - Passe avant (algorithme de Kahn pour l'ordre topologique)
 * - Passe arriere
 * - Les taches critiques ont une marge (float) nulle
 */
export function computeCriticalPath(tasks: GanttTask[], deps: TaskDependencyDTO[]): Set<number> {
  const criticalIds = new Set<number>();
  const nodeMap = new Map<number, CpNode>();

  // Build nodes (only leaf tasks, not summaries)
  for (const t of tasks) {
    if (t.id != null && !t.isSummary) {
      nodeMap.set(t.id, {
        id: t.id,
        duration: t.durationDays ?? 1,
        es: 0,
        ef: 0,
        ls: 0,
        lf: 0,
        successors: [],
        predecessors: [],
      });
    }
  }

  // Build adjacency
  for (const d of deps) {
    const pred = nodeMap.get(d.predecessorTaskId);
    const succ = nodeMap.get(d.successorTaskId);
    if (pred && succ) {
      pred.successors.push({ id: succ.id, type: d.type ?? 'FS' });
      succ.predecessors.push({ id: pred.id, type: d.type ?? 'FS' });
    }
  }

  const nodes = Array.from(nodeMap.values());
  if (nodes.length === 0) return criticalIds;

  // Forward pass (topological order via Kahn's algorithm)
  const inDegree = new Map<number, number>();
  nodes.forEach((n) => inDegree.set(n.id, n.predecessors.length));
  const queue: CpNode[] = nodes.filter((n) => n.predecessors.length === 0);

  // Set ES for start nodes
  queue.forEach((n) => {
    n.es = 0;
    n.ef = n.duration;
  });

  const order: CpNode[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);
    for (const s of curr.successors) {
      const succ = nodeMap.get(s.id)!;
      // FS: ES(succ) = max(ES(succ), EF(pred))
      const newEs =
        s.type === 'FS'
          ? curr.ef
          : s.type === 'SS'
            ? curr.es
            : s.type === 'FF'
              ? curr.ef - succ.duration
              : /* SF */ curr.es - succ.duration;
      if (newEs > succ.es) {
        succ.es = newEs;
        succ.ef = succ.es + succ.duration;
      }
      const deg = (inDegree.get(succ.id) ?? 1) - 1;
      inDegree.set(succ.id, deg);
      if (deg === 0) queue.push(succ);
    }
  }

  // Backward pass
  const projectEnd = Math.max(...nodes.map((n) => n.ef), 0);
  // Set LF for end nodes (no successors)
  nodes.forEach((n) => {
    if (n.successors.length === 0) {
      n.lf = projectEnd;
      n.ls = n.lf - n.duration;
    } else {
      n.lf = Infinity;
      n.ls = Infinity;
    }
  });

  for (let i = order.length - 1; i >= 0; i--) {
    const curr = order[i];
    for (const s of curr.successors) {
      const succ = nodeMap.get(s.id)!;
      const newLf =
        s.type === 'FS'
          ? succ.ls
          : s.type === 'SS'
            ? succ.ls + curr.duration
            : s.type === 'FF'
              ? succ.lf
              : /* SF */ succ.lf + curr.duration;
      if (newLf < curr.lf) {
        curr.lf = newLf;
        curr.ls = curr.lf - curr.duration;
      }
    }
  }

  // Critical tasks: float (LS - ES) === 0
  for (const n of nodes) {
    const float = n.ls - n.es;
    if (Math.abs(float) < 0.001) {
      criticalIds.add(n.id);
    }
  }

  return criticalIds;
}

// ── Couleurs par statut ──

/** Retourne la couleur de fond d'une barre selon son statut et si elle est critique */
export function getStatusColor(status: string, isCritical: boolean): string {
  if (isCritical) return '#E53935'; // red for critical path
  switch (status) {
    case 'NOT_STARTED':
      return '#90CAF9';
    case 'IN_PROGRESS':
      return '#4CAF50';
    case 'DONE':
      return '#9E9E9E';
    case 'BLOCKED':
      return '#F44336';
    default:
      return '#90CAF9';
  }
}

/** Retourne la couleur de la barre de progression selon le statut */
export function getProgressColor(status: string, isCritical: boolean): string {
  if (isCritical) return '#B71C1C';
  switch (status) {
    case 'NOT_STARTED':
      return '#64B5F6';
    case 'IN_PROGRESS':
      return '#388E3C';
    case 'DONE':
      return '#757575';
    case 'BLOCKED':
      return '#D32F2F';
    default:
      return '#64B5F6';
  }
}

// ── Chemin SVG du losange de jalon (milestone) ──

/** Genere le chemin SVG d'un losange (diamant) pour un jalon */
export function milestonePath(cx: number, cy: number, size: number = MILESTONE_SIZE): string {
  const h = size / 2;
  return `M ${cx} ${cy - h} L ${cx + h} ${cy} L ${cx} ${cy + h} L ${cx - h} ${cy} Z`;
}

// ── Chemin SVG de la barre recapitulative (style MS Project : barre plate avec crochets) ──

/** Genere le chemin SVG d'une barre recapitulative avec des crochets aux extremites */
export function summaryBarPath(x: number, y: number, width: number, height: number): string {
  const tick = 5;
  return (
    `M ${x} ${y + tick} V ${y} H ${x + width} V ${y + tick} ` +
    `M ${x} ${y} V ${y + height} ` +
    `M ${x + width} ${y} V ${y + height}`
  );
}
