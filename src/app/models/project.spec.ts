import { ProjectDTO } from './project';
import { describe, it, expect } from 'vitest';

describe('ProjectDTO', () => {
  it('should conform to ProjectDTO interface shape', () => {
    const project: ProjectDTO = {
      id: 1,
      name: 'Core Banking T24',
      startDate: '2026-01-01',
      active: true,
      projectManagerId: 3,
    };
    expect(project).toBeTruthy();
    expect(project.id).toBe(1);
    expect(project.name).toBe('Core Banking T24');
    expect(project.active).toBe(true);
  });

  it('should allow optional fields to be undefined', () => {
    const project: ProjectDTO = {
      id: 2,
      name: 'IFRS 9',
      startDate: '2026-03-01',
      active: false,
      projectManagerId: 4,
      description: undefined,
      endDate: undefined,
    };
    expect(project.description).toBeUndefined();
    expect(project.endDate).toBeUndefined();
  });
});
