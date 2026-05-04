import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService, AuthUser } from '../services/auth-service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function makeUser(role: string): AuthUser {
  return {
    token: 'jwt.token.here',
    userId: 42,
    email: 'user@biat.tn',
    firstName: 'Test',
    lastName: 'User',
    role,
  };
}

describe('roleGuard', () => {
  let router: Router;

  function setupTestBed() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    router = TestBed.inject(Router);
  }

  beforeEach(() => {
    localStorage.clear();
    setupTestBed();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow access when user has an allowed role', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(makeUser('ADMIN')));
    TestBed.resetTestingModule();
    setupTestBed();

    const guard = roleGuard('ADMIN', 'PMO');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should deny access and redirect to / when authenticated but role is insufficient', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(makeUser('TEAM_MEMBER')));
    TestBed.resetTestingModule();
    setupTestBed();
    const navSpy = vi.spyOn(router, 'navigateByUrl');

    const guard = roleGuard('ADMIN', 'PM');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navSpy).toHaveBeenCalledWith('/');
  });

  it('should redirect to /login when not authenticated', () => {
    const navSpy = vi.spyOn(router, 'navigateByUrl');

    const guard = roleGuard('ADMIN');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navSpy).toHaveBeenCalledWith('/login');
  });

  it('should allow a PM role through a PM-only guard', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(makeUser('PM')));
    TestBed.resetTestingModule();
    setupTestBed();

    const guard = roleGuard('PM');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should deny a PMO user from an ADMIN-only route and redirect to /', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(makeUser('PMO')));
    TestBed.resetTestingModule();
    setupTestBed();
    const navSpy = vi.spyOn(router, 'navigateByUrl');

    const guard = roleGuard('ADMIN');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navSpy).toHaveBeenCalledWith('/');
  });
});
