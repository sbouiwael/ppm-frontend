import { TaskDependencyDTO, DependencyType } from './task-dependency';
import { describe, it, expect } from 'vitest';

describe('TaskDependencyDTO', () => {
  it('should accept a Finish-to-Start dependency', () => {
    const dep: TaskDependencyDTO = {
      predecessorTaskId: 1,
      successorTaskId: 2,
      type: 'FS',
    };
    expect(dep.predecessorTaskId).toBe(1);
    expect(dep.successorTaskId).toBe(2);
    expect(dep.type).toBe('FS');
  });

  it('should accept all four standard dependency types', () => {
    const types: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];
    types.forEach((t) => {
      const dep: TaskDependencyDTO = {
        predecessorTaskId: 1,
        successorTaskId: 2,
        type: t,
      };
      expect(dep.type).toBe(t);
    });
  });
});
