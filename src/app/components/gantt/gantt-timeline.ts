import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TimelineConfig, BarRect, ArrowPath, GridLine,
  ROW_HEIGHT, BAR_HEIGHT, MILESTONE_SIZE,
} from './gantt.models';
import {
  getStatusColor, getProgressColor, dateToX,
  getWeekendRanges, generateGridLines, milestonePath, summaryBarPath,
} from './gantt.utils';

@Component({
  selector: 'gantt-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gantt-timeline.html',
  styleUrls: ['./gantt-timeline.css'],
})
export class GanttTimeline {
  @Input() config!: TimelineConfig;
  @Input() bars: BarRect[] = [];
  @Input() arrows: ArrowPath[] = [];
  @Input() selectedTaskId: number | null = null;

  @Output() taskSelected = new EventEmitter<number>();
  @Output() barDragEnd = new EventEmitter<{ taskId: number; daysDelta: number }>();
  @Output() barResizeEnd = new EventEmitter<{ taskId: number; newDurationDays: number }>();

  readonly ROW_HEIGHT = ROW_HEIGHT;
  readonly MILESTONE_SIZE = MILESTONE_SIZE;

  // Tooltip state
  tooltipBar: BarRect | null = null;
  tooltipX = 0;
  tooltipY = 0;

  // Drag state
  private dragging = false;
  private dragTaskId = 0;
  private dragStartX = 0;
  private dragOrigX = 0;
  private dragType: 'move' | 'resize' = 'move';
  private dragOrigWidth = 0;
  private dragOrigProgressWidth = 0;

  get todayX(): number {
    if (!this.config) return 0;
    return dateToX(new Date(), this.config);
  }

  get weekendRanges(): { x: number; width: number }[] {
    if (!this.config) return [];
    return getWeekendRanges(this.config);
  }

  get gridLines(): GridLine[] {
    if (!this.config) return [];
    return generateGridLines(this.config);
  }

  getBarColor(bar: BarRect): string {
    return getStatusColor(bar.status, bar.isCritical);
  }

  getBarProgressColor(bar: BarRect): string {
    return getProgressColor(bar.status, bar.isCritical);
  }

  getMilestonePath(bar: BarRect): string {
    const cy = bar.y + BAR_HEIGHT / 2;
    return milestonePath(bar.x, cy);
  }

  getMilestoneColor(bar: BarRect): string {
    if (bar.isCritical) return '#E53935';
    if (bar.status === 'DONE') return '#9E9E9E';
    return '#FF9800';
  }

  getSummaryPath(bar: BarRect): string {
    return summaryBarPath(bar.x, bar.y, bar.width, bar.height);
  }

  // Tooltip
  onBarEnter(bar: BarRect, event: MouseEvent): void {
    this.tooltipBar = bar;
    this.tooltipX = event.offsetX + 12;
    this.tooltipY = event.offsetY - 30;
  }

  onBarMove(event: MouseEvent): void {
    if (this.tooltipBar) {
      this.tooltipX = event.offsetX + 12;
      this.tooltipY = event.offsetY - 30;
    }
  }

  onBarLeave(): void {
    this.tooltipBar = null;
  }

  onBarClick(bar: BarRect, event: MouseEvent): void {
    event.stopPropagation();
    this.taskSelected.emit(bar.taskId);
  }

  // Drag to move
  onBarPointerDown(bar: BarRect, event: PointerEvent): void {
    if (bar.isSummary || bar.isMilestone) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.dragTaskId = bar.taskId;
    this.dragStartX = event.clientX;
    this.dragOrigX = bar.x;
    this.dragOrigWidth = bar.width;
    this.dragType = 'move';
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  // Drag to resize
  onResizePointerDown(bar: BarRect, event: PointerEvent): void {
    if (bar.isSummary || bar.isMilestone) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.dragTaskId = bar.taskId;
    this.dragStartX = event.clientX;
    this.dragOrigX = bar.x;
    this.dragOrigWidth = bar.width;
    this.dragOrigProgressWidth = bar.progressWidth;
    this.dragType = 'resize';
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || !this.config) return;
    const dx = event.clientX - this.dragStartX;
    const bar = this.bars.find(b => b.taskId === this.dragTaskId);
    if (!bar) return;

    if (this.dragType === 'move') {
      bar.x = this.dragOrigX + dx;
    } else {
      const newWidth = Math.max(this.config.pixelsPerDay, this.dragOrigWidth + dx);
      bar.width = newWidth;
      bar.progressWidth = this.dragOrigWidth > 0
        ? (this.dragOrigProgressWidth / this.dragOrigWidth) * newWidth
        : 0;
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging || !this.config) return;
    this.dragging = false;
    const dx = event.clientX - this.dragStartX;
    const daysDelta = Math.round(dx / this.config.pixelsPerDay);

    if (this.dragType === 'move' && daysDelta !== 0) {
      this.barDragEnd.emit({ taskId: this.dragTaskId, daysDelta });
    } else if (this.dragType === 'resize') {
      const newWidth = Math.max(this.config.pixelsPerDay, this.dragOrigWidth + dx);
      const newDays = Math.max(1, Math.round(newWidth / this.config.pixelsPerDay));
      this.barResizeEnd.emit({ taskId: this.dragTaskId, newDurationDays: newDays });
    } else {
      // No movement — revert
      const bar = this.bars.find(b => b.taskId === this.dragTaskId);
      if (bar) {
        bar.x = this.dragOrigX;
        bar.width = this.dragOrigWidth;
      }
    }
  }
}
