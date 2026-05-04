import { UserDTO, Role } from './user';
import { describe, it, expect } from 'vitest';

describe('UserDTO', () => {
  it('should accept a valid user', () => {
    const user: UserDTO = {
      id: 1,
      firstName: 'Sami',
      lastName: 'Ben Aissa',
      email: 'sami.benaissa@biat.tn',
      role: 'PM',
      weeklyCapacity: 40,
      active: true,
    };
    expect(user.email).toBe('sami.benaissa@biat.tn');
    expect(user.role).toBe('PM');
  });

  it('should accept all defined roles', () => {
    const roles: Role[] = ['PM', 'PMO', 'DEV', 'QA', 'DEVOPS', 'RH', 'ADMIN'];
    roles.forEach((r) => {
      const user: UserDTO = {
        firstName: 'Test',
        lastName: 'User',
        email: `test@biat.tn`,
        role: r,
        weeklyCapacity: 40,
        active: true,
      };
      expect(user.role).toBe(r);
    });
  });
});