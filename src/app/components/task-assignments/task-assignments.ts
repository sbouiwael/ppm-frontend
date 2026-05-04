import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Subject, debounceTime, takeUntil, combineLatest, distinctUntilChanged } from 'rxjs';

import { TaskAssignmentService } from '../../services/task-assignment-service';
import { CapacityService } from '../../services/capacity-service';
import { AuthService } from '../../services/auth-service';
import { UserService } from '../../services/user-service';
import { TaskAssignmentDTO } from '../../models/task-assignment';
import { AssignmentCapacityCheckDTO } from '../../models/assignment-capacity-check';
import { UserDTO } from '../../models/user';

@Component({
  selector: 'app-task-assignments',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './task-assignments.html',
  styleUrl: './task-assignments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAssignments implements OnInit, OnDestroy {
  taskId!: number;

  assignments: TaskAssignmentDTO[] = [];
  users: UserDTO[] = [];
  errorMessage = '';
  loading = false;

  form: FormGroup;

  // Capacity check state
  capacityCheck: AssignmentCapacityCheckDTO | null = null;
  checkingCapacity = false;
  capacityError = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private assignmentService: TaskAssignmentService,
    private capacityService: CapacityService,
    private userService: UserService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      userId: [null, [Validators.required, Validators.min(1)]],
      assignedHours: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.taskId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.taskId) {
      this.errorMessage = 'Invalid task id';
      return;
    }
    this.load();
    this.loadUsers();
    this.watchFormForCapacityCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    if (!this.auth.hasRole('ADMIN', 'PMO', 'PM')) return;
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = (data ?? []).filter(u => u.active !== false);
        this.cdr.markForCheck();
      },
      error: () => { this.users = []; this.cdr.markForCheck(); },
    });
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User #${userId}`;
  }

  load(): void {
    this.errorMessage = '';
    this.assignmentService.getByTask(this.taskId).subscribe({
      next: (data) => {
        this.assignments = [...(data ?? [])];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error loading assignments';
        this.cdr.markForCheck();
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload: TaskAssignmentDTO = {
      taskId: this.taskId,
      userId: Number(this.form.value.userId),
      assignedHours: Number(this.form.value.assignedHours),
      active: true,
    };

    this.assignmentService.create(payload).subscribe({
      next: () => {
        this.loading = false;
        this.capacityCheck = null;
        this.form.reset({ userId: null, assignedHours: 0 });
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = err?.error?.message ?? 'Error creating assignment';
        this.cdr.markForCheck();
      },
    });
  }

  updateHours(a: TaskAssignmentDTO, hoursStr: string): void {
    if (!a.id) return;
    const hours = Number(hoursStr);
    if (Number.isNaN(hours) || hours < 0) return;
    this.assignmentService.updateHours(a.id, hours).subscribe({
      next: () => this.load(),
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message ?? 'Error updating hours';
        this.cdr.markForCheck();
      },
    });
  }

  deactivate(a: TaskAssignmentDTO): void {
    if (!a.id) return;
    this.assignmentService.deactivate(a.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message ?? 'Error deactivating assignment';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Capacity check ────────────────────────────────────────────────────────

  /** Auto-triggers capacity check whenever userId or assignedHours change. */
  private watchFormForCapacityCheck(): void {
    if (!this.auth.hasRole('ADMIN', 'PMO', 'PM')) return;

    combineLatest([
      this.form.get('userId')!.valueChanges,
      this.form.get('assignedHours')!.valueChanges,
    ]).pipe(
      debounceTime(400),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$)
    ).subscribe(([userId, hours]) => {
      if (userId && hours != null && hours >= 0) {
        this.runCapacityCheck(Number(userId), Number(hours));
      } else {
        this.capacityCheck = null;
        this.capacityError = '';
        this.cdr.markForCheck();
      }
    });
  }

  runCapacityCheck(userId: number, assignedHours: number): void {
    this.checkingCapacity = true;
    this.capacityError = '';
    this.cdr.markForCheck();

    this.capacityService.checkAssignment(userId, this.taskId, assignedHours)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.capacityCheck = result;
          this.checkingCapacity = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.capacityCheck = null;
          this.checkingCapacity = false;
          this.capacityError = 'Unable to check capacity. Please verify task has start/end dates.';
          this.cdr.markForCheck();
        },
      });
  }

  getCheckStatusClass(status: string): string {
    switch (status) {
      case 'OVERLOADED':    return 'check-week--overloaded';
      case 'NEAR_CAPACITY': return 'check-week--near';
      case 'AVAILABLE':     return 'check-week--available';
      default:              return 'check-week--no-capacity';
    }
  }

  getCheckStatusLabel(status: string): string {
    const map: Record<string, string> = {
      AVAILABLE:    'Available',
      NEAR_CAPACITY:'Near Capacity',
      OVERLOADED:   'Overloaded',
      NO_CAPACITY:  'No Capacity',
    };
    return map[status] ?? status;
  }
}
