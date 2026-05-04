/**
 * Composant principal du diagramme de Gantt.
 * Charge les taches et dependances d'un projet, construit l'arborescence
 * hierarchique, calcule le chemin critique, genere les barres et fleches
 * du diagramme, et gere les interactions (zoom, scroll, drag, edition inline).
 */
import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';

import { TaskService } from '../../services/task-service';
import { TaskDependencyService } from '../../services/task-dependency-service';
import { TaskDTO } from '../../models/task';
import { TaskDependencyDTO } from '../../models/task-dependency';

import { GanttGrid, CellEdit, NewTaskRequest } from './gantt-grid';
import { GanttTimeline } from './gantt-timeline';
import { GanttTimescale } from './gantt-timescale';
import {
  GanttTask, TimelineConfig, BarRect, ArrowPath, TimescaleRow, ZoomLevel,
} from './gantt.models';
import {
  buildTimelineConfig, computeBar, computeArrow, generateTimescale,
  buildTaskTree, flattenTree, buildPredecessorsLabel, computeCriticalPath,
  dateToX,
} from './gantt.utils';

@Component({
  selector: 'app-gantt',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GanttGrid, GanttTimeline, GanttTimescale],
  templateUrl: './gantt.html',
  styleUrls: ['./gantt.css'],
})
export class Gantt implements OnInit, OnDestroy {
  /** Reference au corps de la grille (pour synchronisation du scroll) */
  @ViewChild('gridBody') gridBody!: ElementRef<HTMLDivElement>;
  /** Reference au corps de la timeline (pour synchronisation du scroll) */
  @ViewChild('timelineBody') timelineBody!: ElementRef<HTMLDivElement>;
  /** Reference a l'en-tete de l'echelle de temps */
  @ViewChild('timescaleHeader') timescaleHeader!: ElementRef<HTMLDivElement>;

  /** Identifiant du projet */
  projectId!: number;
  /** Indicateur de chargement */
  loading = true;
  /** Message d'erreur */
  errorMessage = '';

  // --- Donnees brutes ---
  /** Taches brutes du projet */
  private rawTasks: TaskDTO[] = [];
  /** Dependances entre les taches */
  dependencies: TaskDependencyDTO[] = [];

  // --- Arborescence et liste aplatie ---
  /** Racines de l'arborescence hierarchique des taches */
  private treeRoots: GanttTask[] = [];
  /** Liste aplatie des taches visibles (respectant l'etat d'expansion/reduction) */
  tasks: GanttTask[] = [];
  /** Ensemble des IDs de taches reduites (collapsed) */
  collapsedIds = new Set<number>();

  // --- Donnees de rendu calculees ---
  /** Configuration de la timeline (dates, zoom, dimensions) */
  config!: TimelineConfig;
  /** Barres du diagramme de Gantt */
  bars: BarRect[] = [];
  /** Fleches des dependances */
  arrows: ArrowPath[] = [];
  /** Echelle de temps (en-tetes superieur et inferieur) */
  timescale!: TimescaleRow;

  /** Niveau de zoom actuel */
  zoom: ZoomLevel = 'day';
  /** ID de la tache selectionnee */
  selectedTaskId: number | null = null;
  /** Largeur de la grille en pixels */
  gridWidth = 560;
  /** Afficher ou non le chemin critique */
  showCriticalPath = true;

  /** Souscription principale (pour le nettoyage) */
  private sub?: Subscription;
  // --- Etat du redimensionnement du splitter ---
  private resizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private depService: TaskDependencyService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Initialisation : recupere l'ID projet de l'URL et charge les donnees */
  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    this.projectId = Number(raw);

    if (!Number.isFinite(this.projectId) || this.projectId <= 0) {
      this.loading = false;
      this.errorMessage = 'Invalid project ID';
      return;
    }

    this.loadData();
  }

  /** Nettoyage : desinscrit la souscription pour eviter les fuites memoire */
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Charge les taches et dependances du projet en parallele */
  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.sub = forkJoin({
      tasks: this.taskService.getTasksByProject(this.projectId),
      deps: this.depService.getByProject(this.projectId),
    }).subscribe({
      next: ({ tasks, deps }) => {
        this.rawTasks = (tasks ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        this.dependencies = deps ?? [];
        this.rebuildAll();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage =
          err?.error?.message
          || (typeof err?.error === 'string' ? err.error : null)
          || (err?.status ? `Error ${err.status}: failed to load project data` : 'Failed to load project data.');
        this.cdr.detectChanges();
      },
    });
  }

  /** Reconstruit l'arborescence, le chemin critique, la liste aplatie et le diagramme */
  private rebuildAll(): void {
    // 1. Build hierarchy tree
    this.treeRoots = buildTaskTree(this.rawTasks);

    // 2. Compute critical path
    const criticalIds = this.showCriticalPath
      ? computeCriticalPath(this.flatAll(), this.dependencies)
      : new Set<number>();

    // Mark critical tasks
    this.markCritical(this.treeRoots, criticalIds);

    // 3. Flatten visible rows
    this.tasks = flattenTree(this.treeRoots, this.collapsedIds);

    // 4. Build predecessors labels
    const taskIdToRow = new Map<number, number>();
    this.tasks.forEach((t, i) => { if (t.id != null) taskIdToRow.set(t.id, i); });
    for (const t of this.tasks) {
      if (t.id != null) {
        t.predecessorsLabel = buildPredecessorsLabel(t.id, this.dependencies, taskIdToRow);
      }
    }

    // 5. Build timeline config, bars, arrows, timescale
    this.rebuildChart();
  }

  /** Recalcule la config, les barres, les fleches et l'echelle de temps */
  private rebuildChart(): void {
    this.config = buildTimelineConfig(this.tasks, this.zoom);

    // Compute bars
    this.bars = [];
    const barMap = new Map<number, BarRect>();
    this.tasks.forEach((task, i) => {
      const bar = computeBar(task, i, this.config);
      if (bar) {
        this.bars.push(bar);
        barMap.set(bar.taskId, bar);
        task.bar = bar;
      }
    });

    // Compute arrows
    this.arrows = [];
    this.dependencies.forEach((dep) => {
      const predBar = barMap.get(dep.predecessorTaskId);
      const succBar = barMap.get(dep.successorTaskId);
      if (predBar && succBar) {
        this.arrows.push({
          id: dep.id ?? 0,
          path: computeArrow(predBar, succBar, dep.type ?? 'FS'),
          type: dep.type ?? 'FS',
        });
      }
    });

    this.timescale = generateTimescale(this.config);
  }

  /** Retourne toutes les taches aplaties (sans tenir compte des reductions) */
  private flatAll(): GanttTask[] {
    return flattenTree(this.treeRoots, new Set());
  }

  /** Marque recursivement les taches du chemin critique */
  private markCritical(nodes: GanttTask[], criticalIds: Set<number>): void {
    for (const node of nodes) {
      node.isCritical = node.id != null && criticalIds.has(node.id);
      if (node.children) this.markCritical(node.children, criticalIds);
    }
  }

  // ── Zoom ──

  /** Change le niveau de zoom et reconstruit le diagramme */
  setZoom(level: ZoomLevel): void {
    this.zoom = level;
    this.rebuildChart();
    this.cdr.detectChanges();
  }

  // ── Basculement du chemin critique ──

  /** Active/desactive l'affichage du chemin critique */
  toggleCriticalPath(): void {
    this.showCriticalPath = !this.showCriticalPath;
    this.rebuildAll();
    this.cdr.detectChanges();
  }

  // ── Defilement vers aujourd'hui ──

  /** Fait defiler la timeline pour centrer la date du jour */
  scrollToToday(): void {
    if (!this.config || !this.timelineBody) return;
    const todayX = dateToX(new Date(), this.config);
    const viewport = this.timelineBody.nativeElement;
    viewport.scrollLeft = Math.max(0, todayX - viewport.clientWidth / 3);
    if (this.timescaleHeader) {
      this.timescaleHeader.nativeElement.scrollLeft = viewport.scrollLeft;
    }
  }

  // ── Zoom pour adapter la vue ──

  /** Ajuste automatiquement le zoom pour que toutes les barres soient visibles */
  zoomToFit(): void {
    if (!this.timelineBody) return;
    const viewportWidth = this.timelineBody.nativeElement.clientWidth;
    if (viewportWidth <= 0 || this.tasks.length === 0) return;

    // Find min start, max end
    let minX = Infinity, maxX = 0;
    for (const bar of this.bars) {
      if (bar.x < minX) minX = bar.x;
      const right = bar.isMilestone ? bar.x + 12 : bar.x + bar.width;
      if (right > maxX) maxX = right;
    }

    if (maxX <= minX) return;
    const rangeWidth = maxX - minX + 40; // padding

    // Pick the best zoom level
    if (rangeWidth <= viewportWidth * 0.8) {
      this.zoom = 'day';
    } else if (rangeWidth <= viewportWidth * 3) {
      this.zoom = 'week';
    } else {
      this.zoom = 'month';
    }

    this.rebuildChart();
    this.cdr.detectChanges();

    // Scroll to start of content
    setTimeout(() => {
      if (this.timelineBody) {
        const newMinX = this.bars.length > 0 ? Math.min(...this.bars.map(b => b.x)) : 0;
        this.timelineBody.nativeElement.scrollLeft = Math.max(0, newMinX - 20);
        if (this.timescaleHeader) {
          this.timescaleHeader.nativeElement.scrollLeft = this.timelineBody.nativeElement.scrollLeft;
        }
      }
    });
  }

  // ── Expansion / Reduction des taches parentes ──

  /** Bascule l'etat d'expansion/reduction d'une tache parente */
  onToggleExpand(taskId: number): void {
    if (this.collapsedIds.has(taskId)) {
      this.collapsedIds.delete(taskId);
    } else {
      this.collapsedIds.add(taskId);
    }
    this.rebuildAll();
    this.cdr.detectChanges();
  }

  // ── Synchronisation du defilement entre grille et timeline ──

  /** Synchronise le scroll vertical de la timeline avec la grille */
  onGridScroll(event: Event): void {
    if (this.timelineBody) {
      this.timelineBody.nativeElement.scrollTop = (event.target as HTMLElement).scrollTop;
    }
  }

  /** Synchronise le scroll vertical de la grille et horizontal de l'echelle */
  onTimelineScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (this.gridBody) {
      this.gridBody.nativeElement.scrollTop = el.scrollTop;
    }
    if (this.timescaleHeader) {
      this.timescaleHeader.nativeElement.scrollLeft = el.scrollLeft;
    }
  }

  // ── Glissement du separateur (splitter) entre grille et timeline ──

  /** Debut du redimensionnement du splitter */
  onSplitterPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.resizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.gridWidth;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onSplitterPointerMove(event: PointerEvent): void {
    if (!this.resizing) return;
    const dx = event.clientX - this.resizeStartX;
    this.gridWidth = Math.max(250, Math.min(900, this.resizeStartWidth + dx));
  }

  onSplitterPointerUp(): void {
    this.resizing = false;
  }

  // ── Selection d'une tache ──

  /** Selectionne ou deselectionne une tache */
  onTaskSelected(taskId: number): void {
    this.selectedTaskId = this.selectedTaskId === taskId ? null : taskId;
  }

  // ── Edition inline d'une cellule de la grille ──

  /** Gere l'edition d'une cellule : sauvegarde la modification via l'API */
  onCellEdited(edit: CellEdit): void {
    const task = this.findRawTask(edit.taskId);
    if (!task) return;

    const updated: TaskDTO = { ...task, [edit.field]: edit.value };
    this.taskService.updateTask(edit.taskId, updated).subscribe({
      next: (saved) => {
        this.replaceRawTask(edit.taskId, saved);
        this.rebuildAll();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to save edit:', err);
        this.errorMessage = 'Failed to save change.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Ajout d'une nouvelle tache depuis la grille ──

  /** Cree une nouvelle tache avec les valeurs par defaut */
  onAddTask(req: NewTaskRequest): void {
    const maxSort = this.rawTasks.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), 0);

    const newTask: TaskDTO = {
      name: req.name,
      projectId: this.projectId,
      durationDays: 1,
      sortOrder: maxSort + 1,
      status: 'NOT_STARTED',
      progress: 0,
      startDate: new Date().toISOString().split('T')[0],
    };

    this.taskService.createTask(newTask).subscribe({
      next: (saved) => {
        this.rawTasks.push(saved);
        this.rebuildAll();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to create task:', err);
        this.errorMessage = 'Failed to create task.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Deplacement d'une barre par glissement ──

  /** Deplace une tache de N jours apres un glissement de barre */
  onBarDragEnd(event: { taskId: number; daysDelta: number }): void {
    const task = this.findRawTask(event.taskId);
    if (!task || !task.startDate) return;

    const start = new Date(task.startDate);
    start.setDate(start.getDate() + event.daysDelta);
    const newStart = start.toISOString().split('T')[0];

    // N'envoie PAS endDate explicitement : le backend recalcule la date de fin
    // a partir de la nouvelle startDate + durationDays en jours ouvres.
    // Un calcul frontend en jours calendaires produirait une endDate incorrecte
    // (week-ends et jours feries non respectes).
    const updated: TaskDTO = { ...task, startDate: newStart, endDate: null };
    this.taskService.updateTask(event.taskId, updated).subscribe({
      next: (saved) => {
        this.replaceRawTask(event.taskId, saved);
        this.rebuildAll();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to move task:', err);
        this.rebuildAll();
        this.cdr.detectChanges();
      },
    });
  }

  // ── Redimensionnement d'une barre par glissement du bord ──

  /** Modifie la duree d'une tache apres un redimensionnement de barre */
  onBarResizeEnd(event: { taskId: number; newDurationDays: number }): void {
    const task = this.findRawTask(event.taskId);
    if (!task) return;

    // N'envoie PAS endDate explicitement : le backend recalcule la date de fin
    // a partir de startDate + newDurationDays en jours ouvres (calendrier du projet).
    // Envoyer un endDate calcule en jours calendaires ici contournerait ce mecanisme.
    const updated: TaskDTO = { ...task, durationDays: event.newDurationDays, endDate: null };

    this.taskService.updateTask(event.taskId, updated).subscribe({
      next: (saved) => {
        this.replaceRawTask(event.taskId, saved);
        this.rebuildAll();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to resize task:', err);
        this.rebuildAll();
        this.cdr.detectChanges();
      },
    });
  }

  // ── Fonctions utilitaires ──

  /** Recherche une tache brute par son ID */
  private findRawTask(taskId: number): TaskDTO | undefined {
    return this.rawTasks.find(t => t.id === taskId);
  }

  /** Remplace une tache brute par sa version sauvegardee */
  private replaceRawTask(taskId: number, saved: TaskDTO): void {
    const idx = this.rawTasks.findIndex(t => t.id === taskId);
    if (idx >= 0) this.rawTasks[idx] = saved;
  }
}
