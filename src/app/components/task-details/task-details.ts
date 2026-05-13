/**
 * Composant d'affichage des details d'une tache.
 * Utilise un flux reactif (Observable) pour charger les donnees
 * de la tache a partir de l'ID dans l'URL.
 */
import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

import { TaskService } from '../../services/task-service';
import { BreadcrumbService } from '../../services/breadcrumb-service';
import { TaskDTO } from '../../models/task';

/** Type du ViewModel pour le template */
type Vm = {
  loading: boolean;
  errorMessage: string;
  taskId: number | null;
  task: TaskDTO | null;
};

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './task-details.html',
  styleUrls: ['./task-details.css'],
})
export class TaskDetails {
  /** Observable du ViewModel contenant les donnees de la tache */
  vm$: Observable<Vm>;

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private breadcrumbService: BreadcrumbService,
  ) {
    this.vm$ = this.route.paramMap.pipe(
      map((pm) => {
        const id = Number(pm.get('id'));
        return Number.isFinite(id) && id > 0 ? id : null;
      }),
      distinctUntilChanged(),
      switchMap((taskId) => {
        if (taskId === null) {
          return of<Vm>({
            loading: false,
            errorMessage: 'Invalid task id in URL.',
            taskId: null,
            task: null,
          });
        }

        return this.taskService.getTaskById(taskId).pipe(
          map((task) => ({ loading: false, errorMessage: '', taskId, task: task ?? null })),
          tap((vm) => {
            if (vm.task && vm.taskId) {
              // Pousse le nom resolu pour le fil d'ariane (remplace "Task #42" par "Implement Login API")
              this.breadcrumbService.setDynamicLabel(String(vm.taskId), vm.task.name);
            }
          }),
          startWith<Vm>({ loading: true, errorMessage: '', taskId, task: null }),
          catchError((err) => {
            console.error(err);
            const msg =
              err?.error?.message ||
              (typeof err?.error === 'string' ? err.error : null) ||
              (err?.status
                ? `Error ${err.status}: failed to load task details`
                : 'Error loading task details.');
            return of<Vm>({ loading: false, errorMessage: msg, taskId, task: null });
          }),
        );
      }),
      shareReplay(1),
    );
  }
}
