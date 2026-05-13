/**
 * Service de navigation par fil d'ariane (breadcrumb).
 *
 * Architecture :
 *   Ce service ecoute les evenements NavigationEnd du Router Angular et construit
 *   dynamiquement le fil d'ariane a partir de la configuration des routes (data.breadcrumb).
 *
 *   Pour les segments dynamiques (ex: /projects/:id, /tasks/:id), le label
 *   est fourni via un resolver ou via un appel explicite setDynamicLabel().
 *   Les composants qui connaissent le nom de l'entite (project, task, portfolio)
 *   appellent setDynamicLabel() apres avoir charge les donnees.
 *
 * Structure d'une entree de breadcrumb :
 *   { label: string, url: string, active: boolean }
 *
 * Exemple de fil d'ariane :
 *   Home > Projects > Project A > Gantt
 *   Home > Projects > Project A > Tasks > Task T > Dependencies
 */
import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  url: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  /** BehaviorSubject exposant le fil d'ariane courant */
  private breadcrumbs$ = new BehaviorSubject<BreadcrumbItem[]>([]);

  /**
   * Cache des labels dynamiques — cle = segment URL brut (ex: "42")
   * Valeur = label resolu (ex: "Core Banking T24")
   * Permet aux composants de pousser le nom de l'entite apres chargement.
   */
  private dynamicLabels: Map<string, string> = new Map();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    // Ecoute chaque fin de navigation pour reconstruire le fil d'ariane
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.rebuild();
    });
  }

  /** Observable du fil d'ariane courant */
  get items$() {
    return this.breadcrumbs$.asObservable();
  }

  /**
   * Permet a un composant de fournir le label resolu pour un segment dynamique.
   * Appeler depuis ngOnInit() une fois que le nom de l'entite est charge.
   *
   * Exemple :
   *   this.breadcrumbService.setDynamicLabel(String(this.projectId), project.name);
   *
   * @param key   Le segment URL qui sera remplace (ex: "42")
   * @param label Le label lisible (ex: "Core Banking T24")
   */
  setDynamicLabel(key: string, label: string): void {
    this.dynamicLabels.set(key, label);
    this.rebuild(); // Reconstruit immediatement avec le nouveau label
  }

  /**
   * Reconstruit le fil d'ariane en parcourant l'URL courante segment par segment.
   *
   * Logique de resolution du label pour chaque segment :
   *   1. Si le segment est dans dynamicLabels → utiliser le label resolu
   *   2. Sinon utiliser la map statique staticLabels
   *   3. Sinon formater le segment (capitalize, remplacement des tirets)
   */
  private rebuild(): void {
    const url = this.router.url.split('?')[0]; // Ignore les query params

    // Pas de breadcrumb sur la page de login
    if (url === '/login') {
      this.breadcrumbs$.next([]);
      return;
    }

    const segments = url.split('/').filter((s) => s.length > 0);
    const crumbs: BreadcrumbItem[] = [];

    // Racine : Home
    crumbs.push({ label: 'Home', url: '/', active: segments.length === 0 });

    let accumulated = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulated += '/' + seg;
      const isLast = i === segments.length - 1;
      const label = this.resolveLabel(seg, segments, i);
      crumbs.push({ label, url: accumulated, active: isLast });
    }

    this.breadcrumbs$.next(crumbs);
  }

  /**
   * Resout le label d'un segment URL.
   *
   * @param seg       Le segment courant (ex: "projects", "42", "gantt")
   * @param segments  Tous les segments de l'URL
   * @param index     Index du segment courant
   */
  private resolveLabel(seg: string, segments: string[], index: number): string {
    // 1. Label dynamique (nom resolu par le composant)
    if (this.dynamicLabels.has(seg)) {
      return this.dynamicLabels.get(seg)!;
    }

    // 2. Labels statiques
    const staticLabels: Record<string, string> = {
      projects: 'Projects',
      new: 'New',
      create: 'New Task',
      edit: 'Edit',
      gantt: 'Gantt',
      tasks: 'Tasks',
      assignments: 'Assignments',
      dependencies: 'Dependencies',
      portefeuilles: 'Portfolios',
      users: 'Users',
      'my-tasks': 'My Tasks',
      capacity: 'Capacity Planning',
      // Wave 2
      audit: 'Audit Trail',
      notifications: 'Notifications',
      'portfolio-dashboard': 'Portfolio Dashboard',
    };

    if (staticLabels[seg]) return staticLabels[seg];

    // 3. Segment numerique (ID) — essaie de l'identifier par contexte
    if (/^\d+$/.test(seg)) {
      const prevSeg = index > 0 ? segments[index - 1] : '';
      switch (prevSeg) {
        case 'projects':
          return `Project #${seg}`;
        case 'tasks':
          return `Task #${seg}`;
        case 'portefeuilles':
          return `Portfolio #${seg}`;
        case 'users':
          return `User #${seg}`;
        default:
          return `#${seg}`;
      }
    }

    // 4. Fallback : capitalize le segment
    return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
  }
}
