import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimescaleRow, TimelineConfig } from './gantt.models';

@Component({
  selector: 'gantt-timescale',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gantt-timescale.html',
  styleUrls: ['./gantt-timescale.css'],
})
export class GanttTimescale {
  @Input() timescale!: TimescaleRow;
  @Input() config!: TimelineConfig;
}
