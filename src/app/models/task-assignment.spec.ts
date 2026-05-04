import { TaskAssignmentDTO } from './task-assignment';
import { describe, it, expect } from 'vitest';

describe('TaskAssignmentDTO', () => {
  it('should accept a minimal valid task assignment', () => {
    const assignment: TaskAssignmentDTO = {
      taskId: 10,
      userId: 3,
      assignedHours: 40,
    };
    expect(assignment.taskId).toBe(10);
    expect(assignment.userId).toBe(3);
    expect(assignment.assignedHours).toBe(40);
  });

  it('should allow optional fields', () => {
    const assignment: TaskAssignmentDTO = {
      id: 7,
      taskId: 10,
      userId: 3,
      assignedHours: 40,
      active: true,
      createdAt: '2026-04-01T10:00:00Z',
    };
    expect(assignment.id).toBe(7);
    expect(assignment.active).toBe(true);
  });
});
