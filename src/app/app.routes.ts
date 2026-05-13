/**
 * Fichier de definition de toutes les routes de l'application.
 * Chaque route est protegee par un guard d'authentification (authGuard)
 * ou un guard de role (roleGuard) selon les permissions requises.
 *
 * Nouvelles routes Wave 1 :
 *   - /my-tasks       : tableau de bord personnel (DEV/QA/DEVOPS)
 *   - /capacity       : planification des capacites (ADMIN/PMO/PM/RH)
 *
 * Guards canDeactivate ajoutees sur tous les formulaires de creation/edition :
 *   - unsavedChangesGuard : protege contre la perte de donnees non sauvegardees
 *
 * La route de fallback redirige vers la page de connexion.
 */
import { Routes } from '@angular/router';

// --- Imports des composants de pages ---
import { LoginComponent } from './components/login/login';
import { ProjectList } from './components/project-list/project-list';
import { ProjectCreate } from './components/project-create/project-create';
import { ProjectDetails } from './components/project-details/project-details';
import { ProjectEdit } from './components/project-edit/project-edit';

import { UserListComponent } from './components/user-list/user-list';
import { UserCreate } from './components/user-create/user-create';
import { UserEdit } from './components/user-edit/user-edit';

import { TaskList } from './components/task-list/task-list';
import { TaskCreate } from './components/task-create/task-create';
import { TaskEdit } from './components/task-edit/task-edit';

import { TaskDetails } from './components/task-details/task-details';
import { TaskAssignments } from './components/task-assignments/task-assignments';
import { TaskDependencies } from './components/task-dependencies/task-dependencies';
import { Gantt } from './components/gantt/gantt';

import { PortefeuilleList } from './components/portefeuille-list/portefeuille-list';
import { PortefeuilleDetails } from './components/portefeuille-details/portefeuille-details';

import { HomePage } from './components/home/home';

// Wave 1 — nouvelles pages
import { MyTasks } from './components/my-tasks/my-tasks';
import { CapacityPlanning } from './components/capacity-planning/capacity-planning';

// Wave 2 — nouvelles pages
import { AuditLogList } from './components/audit-log-list/audit-log-list';
import { NotificationCenter } from './components/notification-center/notification-center';
import { PortfolioDashboard } from './components/portfolio-dashboard/portfolio-dashboard';

// --- Imports des guards ---
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const routes: Routes = [
  // ── Route publique : page de connexion ──
  { path: 'login', component: LoginComponent },

  // ── Accueil : accessible a tous les utilisateurs authentifies ──
  { path: '', component: HomePage, pathMatch: 'full', canActivate: [authGuard] },

  // ── My Tasks : espace de travail personnel (DEV/QA/DEVOPS) ──
  // PM et ADMIN peuvent aussi y acceder pour consulter leurs taches eventuelles
  {
    path: 'my-tasks',
    component: MyTasks,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
  },

  // ── Capacity Planning : planification des ressources (ADMIN/PMO/PM/RH) ──
  {
    path: 'capacity',
    component: CapacityPlanning,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'RH')],
  },

  // ── Projets : lecture pour tous, creation/edition pour ADMIN, PMO, PM ──
  { path: 'projects', component: ProjectList, canActivate: [authGuard] },
  {
    path: 'projects/new',
    component: ProjectCreate,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM')],
    canDeactivate: [unsavedChangesGuard],
  },
  { path: 'projects/:id', component: ProjectDetails, canActivate: [authGuard] },
  {
    path: 'projects/:id/edit',
    component: ProjectEdit,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'projects/:id/gantt',
    component: Gantt,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
  },

  // ── Portefeuilles : lecture pour ADMIN, PMO, PM, RH ; ecriture pour ADMIN, PMO ──
  {
    path: 'portefeuilles',
    component: PortefeuilleList,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'RH')],
  },
  {
    path: 'portefeuilles/:id',
    component: PortefeuilleDetails,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'RH')],
  },

  // ── Utilisateurs : ecriture pour ADMIN, RH ; lecture pour PMO, PM ──
  {
    path: 'users',
    component: UserListComponent,
    canActivate: [roleGuard('ADMIN', 'RH', 'PMO', 'PM')],
  },
  {
    path: 'users/new',
    component: UserCreate,
    canActivate: [roleGuard('ADMIN', 'RH')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'users/:id/edit',
    component: UserEdit,
    canActivate: [roleGuard('ADMIN', 'RH')],
    canDeactivate: [unsavedChangesGuard],
  },

  // ── Taches : lecture pour tous sauf RH, creation ADMIN/PMO/PM, edition elargie aux DEV/QA/DEVOPS ──
  {
    path: 'tasks',
    component: TaskList,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
  },
  {
    path: 'tasks/create',
    component: TaskCreate,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'tasks/:id',
    component: TaskDetails,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
  },
  {
    path: 'tasks/:id/edit',
    component: TaskEdit,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
    canDeactivate: [unsavedChangesGuard],
  },

  // ── Affectations de taches : gestion ADMIN/PMO/PM, lecture DEV/QA/DEVOPS ──
  {
    path: 'tasks/:id/assignments',
    component: TaskAssignments,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
  },

  // ── Dependances de taches : gestion ADMIN/PMO/PM, lecture DEV/QA/DEVOPS ──
  {
    path: 'tasks/:id/dependencies',
    component: TaskDependencies,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM', 'DEV', 'QA', 'DEVOPS')],
  },

  // ── Wave 2 — Journal d'audit : ADMIN, PMO peuvent tout voir ; PM voit par projet ──
  {
    path: 'audit',
    component: AuditLogList,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM')],
  },

  // ── Wave 2 — Centre de notifications : tous les utilisateurs authentifies ──
  {
    path: 'notifications',
    component: NotificationCenter,
    canActivate: [authGuard],
  },

  // ── Wave 2 — Tableau de bord executif portefeuille : ADMIN, PMO, PM ──
  {
    path: 'portfolio-dashboard',
    component: PortfolioDashboard,
    canActivate: [roleGuard('ADMIN', 'PMO', 'PM')],
  },

  // ── Route de repli : toute URL inconnue redirige vers /login ──
  { path: '**', redirectTo: '/login' },
];
