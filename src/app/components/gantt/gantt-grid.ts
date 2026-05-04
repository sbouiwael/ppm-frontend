import { Component, Input, Output, EventEmitter, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GanttTask, ROW_HEIGHT, INDENT_PX } from './gantt.models';

export interface CellEdit {
  taskId: number;
  field: string;
  value: string | number;
}

export interface NewTaskRequest {
  name: string;
}

@Component({
  selector: 'gantt-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gantt-grid.html',
  styleUrls: ['./gantt-grid.css'],
})
export class GanttGrid implements AfterViewChecked {
  @Input() tasks: GanttTask[] = [];
  @Input() selectedTaskId: number | null = null;
  @Input() headerOnly = false;

  @Output() cellEdited = new EventEmitter<CellEdit>();
  @Output() taskSelected = new EventEmitter<number>();
  @Output() toggleExpand = new EventEmitter<number>();
  @Output() addTask = new EventEmitter<NewTaskRequest>();

  @ViewChild('editInput') editInputRef?: ElementRef<HTMLInputElement>;

  editingCell: { taskId: number; field: string } | null = null;
  editValue: string = '';
  newTaskName = '';
  private needsFocus = false;

  readonly ROW_HEIGHT = ROW_HEIGHT;
  readonly INDENT_PX = INDENT_PX;

  ngAfterViewChecked(): void {
    if (this.needsFocus && this.editInputRef) {
      this.editInputRef.nativeElement.focus();
      this.editInputRef.nativeElement.select();
      this.needsFocus = false;
    }
  }

  selectTask(taskId: number | undefined): void {
    if (taskId != null) this.taskSelected.emit(taskId);
  }

  onToggleExpand(event: MouseEvent, taskId: number | undefined): void {
    event.stopPropagation();
    if (taskId != null) this.toggleExpand.emit(taskId);
  }

  startEdit(taskId: number | undefined, field: string, currentValue: unknown): void {
    if (taskId == null) return;
    this.editingCell = { taskId, field };
    this.editValue = currentValue != null ? String(currentValue) : '';
    this.needsFocus = true;
  }

  saveEdit(): void {
    if (!this.editingCell) return;
    const { taskId, field } = this.editingCell;
    let value: string | number = this.editValue;

    if (field === 'durationDays' || field === 'progress') {
      value = Number(this.editValue);
      if (isNaN(value)) value = 0;
      if (field === 'progress') value = Math.max(0, Math.min(100, value as number));
    }

    this.cellEdited.emit({ taskId, field, value });
    this.editingCell = null;
    this.editValue = '';
  }

  cancelEdit(): void {
    this.editingCell = null;
    this.editValue = '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit();
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  onNewTaskKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.newTaskName.trim()) {
      this.addTask.emit({ name: this.newTaskName.trim() });
      this.newTaskName = '';
    }
  }

  isEditing(taskId: number | undefined, field: string): boolean {
    return this.editingCell?.taskId === taskId && this.editingCell?.field === field;
  }

  getIndent(task: GanttTask): number {
    return (task.level ?? 0) * INDENT_PX;
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  // Convert display date to API format YYYY-MM-DD
  parseInputDate(val: string): string {
    // Input type=date gives YYYY-MM-DD
    return val;
  }

  statusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'NOT_STARTED': return 'Not Started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'DONE':        return 'Done';
      case 'BLOCKED':     return 'Blocked';
      default:            return '';
    }
  }

  getEffectiveStart(task: GanttTask): string | null | undefined {
    return task.isSummary ? task.summaryStart : task.startDate;
  }

  getEffectiveEnd(task: GanttTask): string | null | undefined {
    return task.isSummary ? task.summaryEnd : task.endDate;
  }
}
