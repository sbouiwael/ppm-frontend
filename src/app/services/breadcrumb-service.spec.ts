import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { BreadcrumbService } from './breadcrumb-service';
import { Component } from '@angular/core';

/** Dummy component for routing in tests */
@Component({ template: '', standalone: true })
class DummyComponent {}

/**
 * Tests unitaires pour BreadcrumbService (Vitest).
 * Verifie la construction du fil d'ariane depuis l'URL courante.
 */
describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'projects', component: DummyComponent },
          { path: 'projects/:id', component: DummyComponent },
          { path: 'projects/:id/gantt', component: DummyComponent },
          { path: 'tasks/:id/dependencies', component: DummyComponent },
          { path: 'my-tasks', component: DummyComponent },
          { path: 'capacity', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
      ],
    });
    service = TestBed.inject(BreadcrumbService);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit empty breadcrumbs for login page', async () => {
    await router.navigateByUrl('/login');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    expect(items.length).toBe(0);
  });

  it('should emit [Home] for root URL', async () => {
    await router.navigateByUrl('/');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    expect(items.length).toBe(1);
    expect(items[0].label).toBe('Home');
    expect(items[0].active).toBe(true);
  });

  it('should emit [Home, Projects] for /projects', async () => {
    await router.navigateByUrl('/projects');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    expect(items.length).toBe(2);
    expect(items[0].label).toBe('Home');
    expect(items[0].active).toBe(false);
    expect(items[1].label).toBe('Projects');
    expect(items[1].active).toBe(true);
  });

  it('should emit [Home, Projects, Project #42, Gantt] for /projects/42/gantt', async () => {
    await router.navigateByUrl('/projects/42/gantt');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    expect(items.length).toBe(4);
    expect(items[0].label).toBe('Home');
    expect(items[1].label).toBe('Projects');
    expect(items[2].label).toBe('Project #42');
    expect(items[3].label).toBe('Gantt');
    expect(items[3].active).toBe(true);
  });

  it('should replace dynamic label when setDynamicLabel is called', async () => {
    await router.navigateByUrl('/projects/42/gantt');
    service.setDynamicLabel('42', 'Core Banking T24');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    const projectCrumb = items.find((i) => i.url === '/projects/42');
    expect(projectCrumb?.label).toBe('Core Banking T24');
  });

  it('should emit [Home, My Tasks] for /my-tasks', async () => {
    await router.navigateByUrl('/my-tasks');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    expect(items.length).toBe(2);
    expect(items[1].label).toBe('My Tasks');
  });

  it('should emit [Home, Capacity Planning] for /capacity', async () => {
    await router.navigateByUrl('/capacity');
    let items: any[] = [];
    service.items$.subscribe((i) => {
      items = i;
    });
    expect(items.length).toBe(2);
    expect(items[1].label).toBe('Capacity Planning');
  });
});
