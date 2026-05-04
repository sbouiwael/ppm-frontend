import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthUser } from './auth-service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const MOCK_USER: AuthUser = {
  token: 'jwt.token.here',
  userId: 1,
  email: 'admin@biat.tn',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start logged out when localStorage is empty', () => {
    expect(service.isLoggedIn).toBe(false);
    expect(service.currentUser).toBeNull();
    expect(service.token).toBeNull();
    expect(service.role).toBeNull();
    expect(service.userId).toBeNull();
  });

  it('login() should store user in localStorage and update BehaviorSubject', () => {
    let emittedUser: AuthUser | null = null;
    service.user$.subscribe((u) => (emittedUser = u));

    service.login({ email: 'admin@biat.tn', password: 'secret' }).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
    expect(req.request.method).toBe('POST');
    req.flush(MOCK_USER);

    expect(service.isLoggedIn).toBe(true);
    expect(service.token).toBe(MOCK_USER.token);
    expect(service.role).toBe('ADMIN');
    expect(service.userId).toBe(1);
    expect(emittedUser).toEqual(MOCK_USER);
    expect(JSON.parse(localStorage.getItem('ppm_auth')!)).toEqual(MOCK_USER);
  });

  it('logout() should clear localStorage and set currentUser to null', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(MOCK_USER));
    // Re-create service to pick up stored user
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    const freshService = TestBed.inject(AuthService);
    expect(freshService.isLoggedIn).toBe(true);

    freshService.logout();

    expect(freshService.isLoggedIn).toBe(false);
    expect(freshService.currentUser).toBeNull();
    expect(localStorage.getItem('ppm_auth')).toBeNull();
  });

  it('hasRole() should return true when user has a matching role', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(MOCK_USER));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    const freshService = TestBed.inject(AuthService);

    expect(freshService.hasRole('ADMIN')).toBe(true);
    expect(freshService.hasRole('PM', 'ADMIN')).toBe(true);
  });

  it('hasRole() should return false when user role is not in the list', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(MOCK_USER));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    const freshService = TestBed.inject(AuthService);

    expect(freshService.hasRole('PM')).toBe(false);
    expect(freshService.hasRole('TEAM_MEMBER', 'PMO')).toBe(false);
  });

  it('hasRole() should return false when not logged in', () => {
    expect(service.hasRole('ADMIN', 'PM')).toBe(false);
  });

  it('verifyToken() should refresh local data and preserve the existing token', () => {
    localStorage.setItem('ppm_auth', JSON.stringify(MOCK_USER));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    const freshService = TestBed.inject(AuthService);
    const freshHttpMock = TestBed.inject(HttpTestingController);

    const updatedFromServer: AuthUser = { ...MOCK_USER, firstName: 'Updated' };
    freshService.verifyToken().subscribe();

    const req = freshHttpMock.expectOne((r) => r.url.includes('/auth/me'));
    req.flush(updatedFromServer);

    // Token must remain the locally stored one
    expect(freshService.token).toBe(MOCK_USER.token);
    expect(freshService.currentUser?.firstName).toBe('Updated');
    freshHttpMock.verify();
  });

  it('loadFromStorage() should return null when localStorage contains invalid JSON', () => {
    localStorage.setItem('ppm_auth', '{broken json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    const freshService = TestBed.inject(AuthService);
    expect(freshService.isLoggedIn).toBe(false);
  });
});
