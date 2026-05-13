import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MyTasks } from './my-tasks';
import { TaskAssignmentService } from '../../services/task-assignment-service';
import { TaskService } from '../../services/task-service';
import { AuthService } from '../../services/auth-service';
import { MyTaskDTO } from '../../models/my-task';

/**
 * Tests unitaires pour le composant MyTasks (Vitest).
 * Verifie le filtrage, les indicateurs visuels, et les cas limites.
 */
describe('MyTasks', () => {
  let component: MyTasks;
  let fixture: ComponentFixture<MyTasks>;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  const inTenDays = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

  const sampleTasks: MyTaskDTO[] = [
    {
      assignmentId: 1,
      taskId: 101,
      taskName: 'Task A',
      taskStatus: 'IN_PROGRESS',
      taskProgress: 40,
      startDate: '2026-01-01',
      endDate: inThreeDays,
      wbsNumber: '1.1',
      assignedHours: 20,
      projectId: 10,
      projectName: 'Project Alpha',
      durationDays: 5,
      workHours: 40,
    },
    {
      assignmentId: 2,
      taskId: 102,
      taskName: 'Task B',
      taskStatus: 'BLOCKED',
      taskProgress: 10,
      startDate: '2026-01-01',
      endDate: yesterday,
      wbsNumber: '1.2',
      assignedHours: 10,
      projectId: 10,
      projectName: 'Project Alpha',
      durationDays: 3,
      workHours: 20,
    },
    {
      assignmentId: 3,
      taskId: 103,
      taskName: 'Task C',
      taskStatus: 'DONE',
      taskProgress: 100,
      startDate: '2026-01-01',
      endDate: inTenDays,
      wbsNumber: '2.1',
      assignedHours: 30,
      projectId: 20,
      projectName: 'Project Beta',
      durationDays: 7,
      workHours: 56,
    },
  ];

  const mockAssignmentService = {
    getMyTasks: vi.fn().mockReturnValue(of(sampleTasks)),
  };

  const mockTaskService = {
    patchTaskStatus: vi.fn().mockReturnValue(of({ status: 'IN_PROGRESS', progress: 0 })),
  };

  const authServiceStub = { isLoggedIn: true, currentUser: null };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAssignmentService.getMyTasks.mockReturnValue(of(sampleTasks));
    mockTaskService.patchTaskStatus.mockReturnValue(of({ status: 'IN_PROGRESS', progress: 0 }));

    await TestBed.configureTestingModule({
      imports: [MyTasks],
      providers: [
        provideRouter([]),
        { provide: TaskAssignmentService, useValue: mockAssignmentService },
        { provide: TaskService, useValue: mockTaskService },
        { provide: AuthService, useValue: authServiceStub },
      ],
    }).compileComponents();

    mockAssignmentService.getMyTasks.mockReturnValue(of(sampleTasks));
    fixture = TestBed.createComponent(MyTasks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tasks on init', () => {
    expect(mockAssignmentService.getMyTasks).toHaveBeenCalled();
    expect(component.allTasks.length).toBe(3);
    expect(component.loading).toBe(false);
  });

  it('should show all tasks when no filter is active', () => {
    expect(component.filteredTasks.length).toBe(3);
  });

  it('should filter by status IN_PROGRESS', () => {
    component.filterStatus = 'IN_PROGRESS';
    expect(component.filteredTasks.length).toBe(1);
    expect(component.filteredTasks[0].taskName).toBe('Task A');
  });

  it('should filter by status DONE', () => {
    component.filterStatus = 'DONE';
    expect(component.filteredTasks.length).toBe(1);
    expect(component.filteredTasks[0].taskName).toBe('Task C');
  });

  it('should filter overdue tasks correctly', () => {
    component.filterOverdue = true;
    // Task B : endDate=yesterday, status=BLOCKED → overdue
    expect(component.filteredTasks.length).toBe(1);
    expect(component.filteredTasks[0].taskName).toBe('Task B');
  });

  it('should filter due-soon tasks correctly', () => {
    component.filterDueSoon = true;
    // Task A : endDate in 3 days, status=IN_PROGRESS → due soon
    expect(component.filteredTasks.length).toBe(1);
    expect(component.filteredTasks[0].taskName).toBe('Task A');
  });

  it('should filter by projectId', () => {
    component.filterProjectId = '20';
    expect(component.filteredTasks.length).toBe(1);
    expect(component.filteredTasks[0].projectName).toBe('Project Beta');
  });

  it('isOverdue() should return false for DONE tasks', () => {
    const doneTask = { ...sampleTasks[2], endDate: yesterday, taskStatus: 'DONE' };
    expect(component.isOverdue(doneTask)).toBe(false);
  });

  it('isOverdue() should return true for non-DONE tasks with past endDate', () => {
    const overdueTask = { ...sampleTasks[0], endDate: yesterday, taskStatus: 'IN_PROGRESS' };
    expect(component.isOverdue(overdueTask)).toBe(true);
  });

  it('isDueSoon() should return false for DONE tasks', () => {
    const doneTask = { ...sampleTasks[0], endDate: inThreeDays, taskStatus: 'DONE' };
    expect(component.isDueSoon(doneTask)).toBe(false);
  });

  it('should build project list from tasks', () => {
    expect(component.projects.length).toBe(2);
    const names = component.projects.map((p) => p.name);
    expect(names).toContain('Project Alpha');
    expect(names).toContain('Project Beta');
  });

  it('should set errorMessage on API error', async () => {
    mockAssignmentService.getMyTasks.mockReturnValue(throwError(() => new Error('Network error')));
    const fixture2 = TestBed.createComponent(MyTasks);
    const comp2 = fixture2.componentInstance;
    fixture2.detectChanges();
    expect(comp2.errorMessage).toBeTruthy();
    expect(comp2.loading).toBe(false);
  });

  it('resetFilters() should reset all filters', () => {
    component.filterStatus = 'DONE';
    component.filterOverdue = true;
    component.filterProjectId = '10';
    component.resetFilters();
    expect(component.filterStatus).toBe('ALL');
    expect(component.filterOverdue).toBe(false);
    expect(component.filterProjectId).toBe('');
  });

  it('getTaskCardClass() should return blocked class for BLOCKED tasks', () => {
    const blocked = { ...sampleTasks[0], taskStatus: 'BLOCKED', endDate: inThreeDays };
    expect(component.getTaskCardClass(blocked)).toContain('blocked');
  });

  it('getTaskCardClass() should return overdue class for overdue tasks', () => {
    const overdue = { ...sampleTasks[0], taskStatus: 'IN_PROGRESS', endDate: yesterday };
    expect(component.getTaskCardClass(overdue)).toContain('overdue');
  });

  // ── Quick Actions ─────────────────────────────────────────────────────────

  it('quickActions() for NOT_STARTED should return [Start]', () => {
    const task = { ...sampleTasks[0], taskStatus: 'NOT_STARTED' };
    const actions = component.quickActions(task);
    expect(actions.length).toBe(1);
    expect(actions[0].status).toBe('IN_PROGRESS');
    expect(actions[0].label).toBe('Start');
  });

  it('quickActions() for IN_PROGRESS should return [Mark Done, Mark Blocked]', () => {
    const task = { ...sampleTasks[0], taskStatus: 'IN_PROGRESS' };
    const actions = component.quickActions(task);
    expect(actions.length).toBe(2);
    expect(actions.map((a) => a.status)).toContain('DONE');
    expect(actions.map((a) => a.status)).toContain('BLOCKED');
  });

  it('quickActions() for BLOCKED should return [Resume]', () => {
    const task = { ...sampleTasks[1], taskStatus: 'BLOCKED' };
    const actions = component.quickActions(task);
    expect(actions.length).toBe(1);
    expect(actions[0].status).toBe('IN_PROGRESS');
  });

  it('quickActions() for DONE should return [Reopen]', () => {
    const task = { ...sampleTasks[2], taskStatus: 'DONE' };
    const actions = component.quickActions(task);
    expect(actions.length).toBe(1);
    expect(actions[0].status).toBe('IN_PROGRESS');
  });

  it('applyQuickAction() should call patchTaskStatus and update task status', () => {
    mockTaskService.patchTaskStatus.mockReturnValue(of({ status: 'IN_PROGRESS', progress: 10 }));
    const task = { ...sampleTasks[0], taskStatus: 'NOT_STARTED' };
    component.allTasks = [task];

    component.applyQuickAction(task, 'IN_PROGRESS');

    expect(mockTaskService.patchTaskStatus).toHaveBeenCalledWith(task.taskId, 'IN_PROGRESS');
    expect(task.taskStatus).toBe('IN_PROGRESS');
    expect(task.taskProgress).toBe(10);
  });

  it('applyQuickAction() should not call service twice on double-click', () => {
    // Simulate task already being updated
    component.updatingTaskIds.add(sampleTasks[0].taskId);
    component.applyQuickAction(sampleTasks[0], 'DONE');
    expect(mockTaskService.patchTaskStatus).not.toHaveBeenCalled();
  });
});
