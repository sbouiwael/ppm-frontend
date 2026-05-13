import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService, AuthUser } from '../services/auth-service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MOCK_USER: AuthUser = {
  token: 'jwt.token.here',
  userId: 1,
  email: 'admin@biat.tn',
  firstName: 'Admin',
  lastName: 'Test',
  role: 'ADMIN',
};

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  function setupTestBed() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthService],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  }

  beforeEach(() => {
    localStorage.clear();
    setupTestBed();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow access when user is logged in', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(MOCK_USER));
    TestBed.resetTestingModule();
    setupTestBed();

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should deny access and navigate to /login when not logged in', () => {
    const navSpy = vi.spyOn(router, 'navigateByUrl');

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navSpy).toHaveBeenCalledWith('/login');
  });
});
