import { TaskDTO, TaskStatus } from './task';
import { describe, it, expect } from 'vitest';

describe('TaskDTO', () => {
  it('should accept a minimal valid task', () => {
    const task: TaskDTO = {
      name: 'Analyse des besoins T24',
      projectId: 1,
    };
    expect(task.name).toBe('Analyse des besoins T24');
    expect(task.projectId).toBe(1);
  });

  it('should accept all four task statuses', () => {
    const statuses: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
    statuses.forEach((s) => {
      const task: TaskDTO = { name: 'Test', projectId: 1, status: s };
      expect(task.status).toBe(s);
    });
  });

  it('should allow nested WBS hierarchy via parentTaskId', () => {
    const parent: TaskDTO = { id: 1, name: 'Phase 1', projectId: 1 };
    const child: TaskDTO = { id: 2, name: 'Analyse', projectId: 1, parentTaskId: 1 };
    expect(child.parentTaskId).toBe(parent.id);
  });
});