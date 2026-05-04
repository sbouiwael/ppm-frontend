import { CreateProjectRequest, UpdateProjectRequest } from './project.requests';
import { describe, it, expect } from 'vitest';

describe('CreateProjectRequest', () => {
  it('should accept a minimal valid project creation request', () => {
    const req: CreateProjectRequest = {
      name: 'SOC 2026',
      startDate: '2026-04-01',
      projectManagerId: 5,
    };
    expect(req.name).toBe('SOC 2026');
    expect(req.startDate).toBe('2026-04-01');
    expect(req.projectManagerId).toBe(5);
  });

  it('should accept all optional fields', () => {
    const req: CreateProjectRequest = {
      name: 'Mobile BIAT+',
      startDate: '2026-01-15',
      endDate: '2026-12-31',
      projectManagerId: 3,
      description: 'Application mobile BIAT',
      portfolioName: 'Transformation Digitale',
      progress: 58,
      calendarId: 1,
      active: true,
    };
    expect(req.progress).toBe(58);
    expect(req.portfolioName).toBe('Transformation Digitale');
  });
});

describe('UpdateProjectRequest', () => {
  it('should allow a partial update with only changed fields', () => {
    const update: UpdateProjectRequest = { progress: 72 };
    expect(update.progress).toBe(72);
    expect(update.name).toBeUndefined();
  });
});
