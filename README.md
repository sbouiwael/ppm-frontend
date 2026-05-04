# PPM Project - Frontend (Angular)

## Project Portfolio Management - Interface Web

Application frontend pour la gestion de portefeuilles de projets (PPM), construite avec **Angular 21** et **TypeScript 5.9**. Cette interface fournit un tableau de bord complet, un diagramme de Gantt interactif, la gestion des projets, taches, utilisateurs, portefeuilles, affectations et dependances.

---

## Table des matieres

1. [Stack technique](#stack-technique)
2. [Architecture du projet](#architecture-du-projet)
3. [Pre-requis](#pre-requis)
4. [Installation et demarrage](#installation-et-demarrage)
5. [Configuration](#configuration)
6. [RBAC — Roles et acces](#rbac--roles-et-acces)
7. [Routing (Navigation)](#routing-navigation)
8. [Modeles de donnees (Interfaces TypeScript)](#modeles-de-donnees)
9. [Services HTTP](#services-http)
10. [Guards de navigation](#guards-de-navigation)
11. [Composants - Vue d'ensemble](#composants---vue-densemble)
12. [Composants - Detail par module](#composants---detail-par-module)
13. [Wave 1 — Nouvelles fonctionnalites](#wave-1--nouvelles-fonctionnalites)
14. [Diagramme de Gantt interactif](#diagramme-de-gantt-interactif)
15. [Composants partages](#composants-partages)
16. [Systeme de design et styles](#systeme-de-design-et-styles)
17. [Gestion des fichiers projet](#gestion-des-fichiers-projet)
18. [Import Excel](#import-excel)
19. [Tests](#tests)
20. [Structure des dossiers](#structure-des-dossiers)
21. [Build et deploiement](#build-et-deploiement)
22. [Scripts disponibles](#scripts-disponibles)

---

## Stack technique

| Composant          | Technologie        | Version  |
|--------------------|--------------------|----------|
| Framework          | Angular            | 21.1.0   |
| Langage            | TypeScript         | 5.9.2    |
| CLI                | Angular CLI        | 21.1.2   |
| Reactive           | RxJS               | 7.8.0    |
| Excel              | xlsx (SheetJS)     | 0.18.5   |
| Tests              | Vitest             | 4.0.8    |
| Package Manager    | npm                | 11.6.2   |
| Styling            | CSS natif + CSS Variables | - |

---

## Architecture du projet

Le projet suit une architecture **component-based** avec des **standalone components** (Angular 14+) :

```
App (Shell : Navbar + Router Outlet + Footer)
  |
  ├── Home Page (Dashboard)
  ├── Projects Module
  │   ├── ProjectList (recherche, tri, pagination, import Excel)
  │   ├── ProjectCreate (formulaire reactif)
  │   ├── ProjectDetails (details + gestion fichiers)
  │   ├── ProjectEdit (formulaire reactif)
  │   └── Gantt (diagramme interactif)
  ├── Portfolios Module
  │   ├── PortefeuilleList (recherche, tri, creation inline)
  │   └── PortefeuilleDetails (gestion projets, edition inline)
  ├── Tasks Module
  │   ├── TaskList (recherche, tri, pagination)
  │   ├── TaskCreate (formulaire reactif)
  │   ├── TaskDetails (lecture seule)
  │   ├── TaskEdit (formulaire reactif)
  │   ├── TaskAssignments (affectation ressources)
  │   └── TaskDependencies (gestion dependances)
  ├── Users Module
  │   ├── UserList (recherche, tri, pagination)
  │   ├── UserCreate (formulaire reactif)
  │   └── UserEdit (formulaire reactif)
  └── Shared
      ├── ConfirmDialog
      └── Pagination
```

**Patterns utilises :**
- **Standalone Components** : Pas de NgModules, chaque composant declare ses imports
- **Reactive Forms** : Utilisation de `FormBuilder` avec validation
- **Observable Pattern** : RxJS pour les flux de donnees (vm$ pattern)
- **Service Injection** : Services `providedIn: 'root'` injectes via le constructeur
- **DTO Pattern** : Interfaces TypeScript alignees avec les DTOs du backend

---

## Pre-requis

- **Node.js 18+** installe
- **npm 9+** installe
- **Backend API** en cours d'execution sur `http://localhost:8082`
- **Port 4200** disponible (developpement)

---

## Installation et demarrage

### 1. Cloner le repository

```bash
git clone <url-du-repo>
cd fr-main
```

### 2. Installer les dependances

```bash
npm install
```

### 3. Verifier la configuration API

Le fichier `src/environments/environment.ts` doit pointer vers le backend :

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8082/api'
};
```

### 4. Demarrer le serveur de developpement

```bash
npm start
```

L'application est accessible sur : `http://localhost:4200`

---

## Configuration

### Environnement (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8082/api'
};
```

### Application (`src/app/app.config.ts`)

Providers configures :
- `provideRouter(routes)` : Systeme de routing
- `provideHttpClient()` : Client HTTP pour les appels API
- `provideZonelessChangeDetection()` ou `provideZoneChangeDetection()` : Detection de changements

### Build (`angular.json`)

| Parametre | Valeur |
|-----------|--------|
| Build output | `dist/ppm_front` |
| Budget initial | 500KB warning, 1MB error |
| Budget composant | 4KB warning, 8KB error |
| Source maps (dev) | Oui |
| Optimisation (prod) | Oui |

---

## RBAC — Roles et acces

Les routes sont proteges par `roleGuard` (Angular `CanActivateFn`). La validation est doublee cote backend via `@PreAuthorize`.

| Role | Ecrans accessibles |
|------|--------------------|
| **ADMIN** | Tous les ecrans |
| **PMO** | Projets, Taches, Utilisateurs, Portefeuilles, Capacity Planning |
| **PM** | Projets (les siens), Taches, Assignments, Gantt, My Tasks, Capacity Planning |
| **RH** | Utilisateurs, Capacity Planning |
| **DEV** | My Tasks, Taches (lecture/edition des taches assignees) |
| **QA** | My Tasks, Taches (lecture/edition des taches assignees) |
| **DEVOPS** | My Tasks, Taches (lecture/edition des taches assignees) |

---

## Routing (Navigation)

| Route | Composant | Guard roles | Notes |
|-------|-----------|-------------|-------|
| `/` | `HomePage` | Authentifie | Dashboard |
| `/projects` | `ProjectList` | ADMIN, PMO, PM, RH | - |
| `/projects/new` | `ProjectCreate` | ADMIN, PMO, PM | `canDeactivate` |
| `/projects/:id` | `ProjectDetails` | ADMIN, PMO, PM, RH | - |
| `/projects/:id/edit` | `ProjectEdit` | ADMIN, PMO, PM | `canDeactivate` |
| `/projects/:id/gantt` | `Gantt` | ADMIN, PMO, PM, RH | - |
| `/portefeuilles` | `PortefeuilleList` | ADMIN, PMO | - |
| `/portefeuilles/:id` | `PortefeuilleDetails` | ADMIN, PMO | - |
| `/users` | `UserList` | ADMIN, PMO, RH | - |
| `/users/new` | `UserCreate` | ADMIN, PMO, RH | `canDeactivate` |
| `/users/:id/edit` | `UserEdit` | ADMIN, PMO, RH | `canDeactivate` |
| `/tasks` | `TaskList` | Authentifie | - |
| `/tasks/create` | `TaskCreate` | ADMIN, PMO, PM | `canDeactivate` |
| `/tasks/:id` | `TaskDetails` | Authentifie | - |
| `/tasks/:id/edit` | `TaskEdit` | ADMIN, PMO, PM | `canDeactivate` |
| `/tasks/:id/assignments` | `TaskAssignments` | Authentifie | - |
| `/tasks/:id/dependencies` | `TaskDependencies` | Authentifie | - |
| `/my-tasks` | `MyTasks` | ADMIN, PMO, PM, DEV, QA, DEVOPS | Wave 1 |
| `/capacity` | `CapacityPlanning` | ADMIN, PMO, PM, RH | Wave 1 |

### Navigation persistante

La **navbar** est visible sur toutes les pages et comprend :
- Logo BIAT Innovation & Technology
- Liens : Home, Projects, Portfolios, Tasks, Users, My Tasks (DEV/QA/DEVOPS), Capacity (ADMIN/PMO/PM/RH)
- Mise en surbrillance du lien actif (`routerLinkActive`)
- Menu hamburger responsive pour mobile

Le **breadcrumb** s'affiche sous la navbar (sauf sur la page login) :
- Construit dynamiquement depuis l'URL active
- Labels dynamiques : nom reel du projet/tache/portefeuille
- Exemple : `Home > Projects > Core Banking T24 > Gantt`

---

## Modeles de donnees

### ProjectDTO (`models/project.ts`)

```typescript
interface ProjectDTO {
  id: number;
  name: string;
  description?: string | null;
  startDate: string;              // YYYY-MM-DD
  endDate?: string | null;
  active: boolean;
  projectManagerId: number;
  portfolioName?: string | null;
  programName?: string | null;
  subProgramName?: string | null;
  objective?: string | null;
  calendarName?: string | null;
  baselineStartDate?: string | null;
  baselineEndDate?: string | null;
  progress?: number | null;       // 0-100
  portefeuilleId?: number | null;
}
```

### TaskDTO (`models/task.ts`)

```typescript
interface TaskDTO {
  id?: number;
  name: string;
  description?: string | null;
  projectId: number;
  parentTaskId?: number | null;   // Hierarchie WBS
  wbsNumber?: string | null;
  mode?: string | null;
  durationDays?: number | null;
  workHours?: number | null;
  baselineDurationDays?: number | null;
  baselineStartDate?: string | null;
  baselineEndDate?: string | null;
  actualWorkHours?: number | null;
  calendarName?: string | null;
  sortOrder?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: TaskStatus | null;     // NOT_STARTED | IN_PROGRESS | DONE | BLOCKED
  progress?: number | null;       // 0-100
  active?: boolean;
  createdAt?: string;
}
```

### UserDTO (`models/user.ts`)

```typescript
interface UserDTO {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;                     // PM | PMO | DEV | QA | DEVOPS | RH | ADMIN
  weeklyCapacity: number;
  active?: boolean;
  createdAt?: string;
}

type CreateUserPayload = UserDTO & { password: string };
type UpdateUserPayload = Partial<CreateUserPayload>;
```

### TaskAssignmentDTO (`models/task-assignment.ts`)

```typescript
interface TaskAssignmentDTO {
  id?: number;
  taskId: number;
  userId: number;
  assignedHours: number;
  active?: boolean;
  createdAt?: string;
}
```

### TaskDependencyDTO (`models/task-dependency.ts`)

```typescript
interface TaskDependencyDTO {
  id?: number;
  predecessorTaskId: number;
  successorTaskId: number;
  type?: DependencyType;          // FS | SS | FF | SF
  createdAt?: string;
}
```

### PortefeuilleDTO (`models/portefeuille.ts`)

```typescript
interface PortefeuilleDTO {
  id: number;
  nom: string;
  description?: string | null;
  projects: ProjectDTO[];
}

interface PortefeuilleCreateUpdateRequest {
  nom: string;
  description?: string | null;
}
```

### MyTaskDTO (`models/my-task.ts`) — Wave 1

```typescript
interface MyTaskDTO {
  assignmentId: number;
  taskId: number;
  taskName: string;
  taskStatus: string;         // NOT_STARTED | IN_PROGRESS | DONE | BLOCKED
  taskProgress: number;       // 0-100
  startDate: string;
  endDate: string;
  wbsNumber: string;
  assignedHours: number;
  projectId: number;
  projectName: string;
  durationDays: number;
  workHours: number;
}
```

### ResourceCapacityDTO (`models/resource-capacity.ts`) — Wave 1

```typescript
interface ResourceCapacityDTO {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  weeklyCapacity: number;
  totalAssignedHours: number;
  utilizationPct: number;     // 0-200+
  capacityStatus: string;     // OVERLOADED | BALANCED | UNDERUTILIZED | NO_CAPACITY
}
```

---

## Services HTTP

Tous les services utilisent `HttpClient` et sont `providedIn: 'root'`. L'URL de base est configuree dans `environment.apiUrl`.

### ProjectService (`services/project-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `getAllProjects()` | GET | `/projects` | `Observable<ProjectDTO[]>` |
| `getProjectById(id)` | GET | `/projects/:id` | `Observable<ProjectDTO>` |
| `getByManager(managerId)` | GET | `/projects/manager/:id` | `Observable<ProjectDTO[]>` |
| `createProject(payload)` | POST | `/projects` | `Observable<ProjectDTO>` |
| `updateProject(id, payload)` | PUT | `/projects/:id` | `Observable<ProjectDTO>` |
| `deactivateProject(id)` | DELETE | `/projects/:id` | `Observable<void>` |

### TaskService (`services/task-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `createTask(dto)` | POST | `/tasks` | `Observable<TaskDTO>` |
| `getTasksByProject(projectId)` | GET | `/tasks/project/:id` | `Observable<TaskDTO[]>` |
| `getTaskById(id)` | GET | `/tasks/:id` | `Observable<TaskDTO>` |
| `updateTask(id, dto)` | PUT | `/tasks/:id` | `Observable<TaskDTO>` |
| `deactivateTask(id)` | DELETE | `/tasks/:id` | `Observable<void>` |

### UserService (`services/user-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `getAllUsers()` | GET | `/users` | `Observable<UserDTO[]>` |
| `getUserById(id)` | GET | `/users/:id` | `Observable<UserDTO>` |
| `getUserByEmail(email)` | GET | `/users/email/:email` | `Observable<UserDTO>` |
| `createUser(payload)` | POST | `/users` | `Observable<any>` |
| `updateUser(id, payload)` | PUT | `/users/:id` | `Observable<any>` |
| `deactivateUser(id)` | DELETE | `/users/:id` | `Observable<void>` |

### TaskAssignmentService (`services/task-assignment-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `getByTask(taskId)` | GET | `/assignments/task/:id` | `Observable<TaskAssignmentDTO[]>` |
| `getByUser(userId)` | GET | `/assignments/user/:id` | `Observable<TaskAssignmentDTO[]>` |
| `getMyTasks()` | GET | `/assignments/me` | `Observable<MyTaskDTO[]>` |
| `create(dto)` | POST | `/assignments` | `Observable<TaskAssignmentDTO>` |
| `updateHours(id, hours)` | PUT | `/assignments/:id/hours/:h` | `Observable<TaskAssignmentDTO>` |
| `deactivate(id)` | DELETE | `/assignments/:id` | `Observable<void>` |

### TaskDependencyService (`services/task-dependency-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `getPredecessors(taskId)` | GET | `/dependencies/predecessors/:id` | `Observable<TaskDependencyDTO[]>` |
| `getSuccessors(taskId)` | GET | `/dependencies/successors/:id` | `Observable<TaskDependencyDTO[]>` |
| `create(req)` | POST | `/dependencies` | `Observable<TaskDependencyDTO>` |
| `delete(id)` | DELETE | `/dependencies/:id` | `Observable<void>` |
| `getByProject(projectId)` | GET | `/dependencies/project/:id` | `Observable<TaskDependencyDTO[]>` |

### PortefeuilleService (`services/portefeuille-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `getAll()` | GET | `/portefeuilles` | `Observable<PortefeuilleDTO[]>` |
| `getById(id)` | GET | `/portefeuilles/:id` | `Observable<PortefeuilleDTO>` |
| `create(payload)` | POST | `/portefeuilles` | `Observable<PortefeuilleDTO>` |
| `update(id, payload)` | PUT | `/portefeuilles/:id` | `Observable<PortefeuilleDTO>` |
| `delete(id)` | DELETE | `/portefeuilles/:id` | `Observable<void>` |
| `addProject(pfId, projId)` | POST | `/portefeuilles/:id/projects/:pid` | `Observable<PortefeuilleDTO>` |
| `removeProject(pfId, projId)` | DELETE | `/portefeuilles/:id/projects/:pid` | `Observable<PortefeuilleDTO>` |
| `getUnassignedProjects()` | GET | `/portefeuilles/unassigned-projects` | `Observable<ProjectDTO[]>` |

### CapacityService (`services/capacity-service.ts`) — Wave 1

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `getCapacityOverview(role?, projectId?)` | GET | `/capacity` | `Observable<ResourceCapacityDTO[]>` |

Filtre optionnel : `?role=DEV`, `?projectId=10`. Params passes via `HttpParams`.

### BreadcrumbService (`services/breadcrumb-service.ts`) — Wave 1

| Methode / Propriete | Description |
|---------------------|-------------|
| `items$` | `Observable<BreadcrumbItem[]>` — liste reactive du fil d'ariane |
| `setDynamicLabel(key, label)` | Remplace le label d'un segment URL par un nom reel (ex: `'42'` → `'Core Banking T24'`) |

S'abonne aux evenements `NavigationEnd` du Router. Labels statiques integres : `projects`, `tasks`, `gantt`, `my-tasks`, `capacity`, `portefeuilles`, `assignments`, `dependencies`, `users`.

### FileService (`services/file-service.ts`)

| Methode | HTTP | Endpoint | Retour |
|---------|------|----------|--------|
| `uploadFile(projId, subdir, file)` | POST | `/projects/:id/files` (FormData) | `Observable<{filename: string}>` |
| `listFiles(projId, subdir)` | GET | `/projects/:id/files?subdirectory=` | `Observable<string[]>` |

**Sous-dossiers disponibles :** `fonctions`, `P.V`, `contrats`

---

## Guards de navigation

| Guard | Fichier | Type | Description |
|-------|---------|------|-------------|
| `authGuard` | `guards/auth-guard.ts` | `CanActivateFn` | Redirige vers `/login` si non authentifie |
| `roleGuard(roles)` | `guards/role-guard.ts` | `CanActivateFn` | Bloque l'acces si le role JWT ne correspond pas |
| `unsavedChangesGuard` | `guards/unsaved-changes.guard.ts` | `CanDeactivateFn` | Dialog de confirmation si formulaire modifie non sauvegarde |

### Interface HasUnsavedChanges

Les composants proteges par `unsavedChangesGuard` implementent :

```typescript
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}
```

**Pattern `savedSuccessfully`** : chaque composant declare un flag `private savedSuccessfully = false`. Il est mis a `true` avant la navigation post-sauvegarde pour eviter le dialog de confirmation.

---

## Composants - Vue d'ensemble

| Composant | Route | Fonctionnalites principales |
|-----------|-------|----------------------------|
| **HomePage** | `/` | Dashboard avec 4 cartes d'acces rapide |
| **ProjectList** | `/projects` | Recherche, tri, pagination, import Excel, suppression |
| **ProjectCreate** | `/projects/new` | Formulaire reactif avec validation, canDeactivate |
| **ProjectDetails** | `/projects/:id` | Affichage details + upload/liste fichiers |
| **ProjectEdit** | `/projects/:id/edit` | Formulaire pre-rempli, modification, canDeactivate |
| **Gantt** | `/projects/:id/gantt` | Diagramme de Gantt interactif complet |
| **PortefeuilleList** | `/portefeuilles` | Liste, recherche, tri, creation inline |
| **PortefeuilleDetails** | `/portefeuilles/:id` | Edition inline, gestion projets, creation projet |
| **TaskList** | `/tasks` | Liste par projet, recherche, tri, pagination |
| **TaskCreate** | `/tasks/create` | Formulaire tache avec champs Gantt, canDeactivate |
| **TaskDetails** | `/tasks/:id` | Vue lecture seule |
| **TaskEdit** | `/tasks/:id/edit` | Modification tache, canDeactivate |
| **TaskAssignments** | `/tasks/:id/assignments` | Affectation utilisateurs, heures |
| **TaskDependencies** | `/tasks/:id/dependencies` | Predecesseurs/successeurs, types FS/SS/FF/SF |
| **UserList** | `/users` | Liste, recherche, tri, pagination |
| **UserCreate** | `/users/new` | Formulaire creation utilisateur, canDeactivate |
| **UserEdit** | `/users/:id/edit` | Modification utilisateur, canDeactivate |
| **MyTasks** | `/my-tasks` | Tableau de bord personnel (Wave 1) |
| **CapacityPlanning** | `/capacity` | Vue de charge des ressources (Wave 1) |
| **Breadcrumb** | *(global)* | Fil d'ariane contextuel (Wave 1) |

---

## Composants - Detail par module

### Module Projets

#### ProjectList
- **Recherche** : Filtre sur nom, description, dates, portfolio, programme, objectif
- **Tri** : Par nom (asc/desc), date debut (asc/desc), progression, statut actif
- **Pagination** : 6 elements par page
- **Import Excel** : Parse un fichier `.xlsx` et cree les projets via l'API
- **Actions** : Double-clic pour editer, bouton supprimer avec confirmation
- **Composants utilises** : `ConfirmDialog`, `Pagination`

#### ProjectCreate / ProjectEdit
- **Champs obligatoires** : name (min 2 car.), startDate, projectManagerId
- **Champs optionnels** : description, endDate, portfolioName, programName, subProgramName, objective, calendarName, baselineStartDate, baselineEndDate, progress (0-100), active
- **Validation** : Validators Angular (required, minLength, min, max)
- **Chef de projet** : Liste deroulante chargee depuis l'API users

#### ProjectDetails
- **Pattern reactif** : Observable `vm$` avec loading/error states
- **Fichiers** : Selection de sous-dossier, upload, liste des fichiers existants
- **Operateurs RxJS** : `distinctUntilChanged`, `switchMap`, `shareReplay`

### Module Taches

#### TaskList
- **Filtre par projet** : Saisie manuelle du projectId
- **Recherche** : Filtre sur nom, description, statut, dates, WBS, progression, heures, duree
- **Tri** : Par nom, date debut, progression, duree, statut (ordre : BLOCKED > IN_PROGRESS > NOT_STARTED > DONE)
- **Pagination** : 6 elements par page
- **Actions** : Liens vers details, edition, affectations, dependances

#### TaskCreate / TaskEdit
- **Champs obligatoires** : projectId, name (min 2 car.), durationDays (min 0.1)
- **Champs Gantt** : wbsNumber, mode, workHours, sortOrder, baselineDurationDays, baselineStartDate, baselineEndDate
- **Statut** : Dropdown (NOT_STARTED, IN_PROGRESS, DONE, BLOCKED)
- **Progression** : Slider 0-100

#### TaskAssignments
- **Affectations existantes** : Liste avec details utilisateur
- **Ajouter** : Selection utilisateur + heures assignees
- **Modifier** : Edition inline des heures
- **Supprimer** : Desactivation

#### TaskDependencies
- **Predecesseurs** : Liste des taches dont depend la tache courante
- **Successeurs** : Liste des taches qui dependent de la tache courante
- **Ajouter** : Selection direction (predecesseur/successeur), ID tache, type (FS, SS, FF, SF)
- **Supprimer** : Suppression directe

### Module Utilisateurs

#### UserList
- **Recherche** : Filtre sur prenom, nom, email, role, capacite, statut actif
- **Tri** : Par nom (asc/desc), role, capacite, statut actif
- **Pagination** : 6 elements par page
- **Actions** : Double-clic pour editer, suppression avec confirmation

#### UserCreate / UserEdit
- **Champs** : firstName (min 2), lastName (min 2), email (valide), role (dropdown), weeklyCapacity (min 0), password (requis a la creation), active
- **Roles disponibles** : PM, PMO, DEV, QA, DEVOPS, RH, ADMIN

### Module Portefeuilles

#### PortefeuilleList
- **Recherche** : Filtre sur nom, description, nombre de projets
- **Tri** : Par nom (asc/desc), nombre de projets (asc/desc)
- **Creation inline** : Formulaire deroulant directement dans la liste
- **Actions** : Double-clic pour ouvrir les details, suppression avec confirmation

#### PortefeuilleDetails
- **Edition inline** : Modifier nom et description directement
- **Projets associes** : Liste des projets du portefeuille, retrait possible
- **Ajouter un projet existant** : Dropdown des projets non affectes
- **Creer un nouveau projet** : Formulaire complet directement dans la page

---

## Wave 1 — Nouvelles fonctionnalites

### My Tasks (`/my-tasks`) — `components/my-tasks/`

Tableau de bord personnel pour les contributeurs (DEV, QA, DEVOPS). Visible aussi pour ADMIN, PMO, PM.

**Filtres :**
- Statut (ALL / NOT_STARTED / IN_PROGRESS / DONE / BLOCKED)
- En retard (`filterOverdue`) : endDate < today ET statut != DONE
- Echeance proche (`filterDueSoon`) : endDate dans 7 jours ET statut != DONE
- Projet (`filterProjectId`) : id du projet

**Indicateurs visuels des cartes :**
| Classe CSS | Condition |
|-----------|-----------|
| `task-card--blocked` | statut = BLOCKED |
| `task-card--overdue` | endDate depassee, statut != DONE |
| `task-card--done` | statut = DONE |
| `task-card--due-soon` | echeance dans 7 jours, statut != DONE |

**Source de donnees :** `TaskAssignmentService.getMyTasks()` → `GET /api/assignments/me` (filtre par userId JWT cote backend)

### Resource Capacity Planning (`/capacity`) — `components/capacity-planning/`

Vue de charge pour ADMIN, PMO, PM, RH.

**Calcul :** `utilizationPct = totalAssignedHours / weeklyCapacity * 100`

**Statuts :**
| Statut | Seuil | Couleur barre |
|--------|-------|--------------|
| OVERLOADED | > 100% | Rouge |
| BALANCED | 75% – 100% | Orange |
| UNDERUTILIZED | < 75% | Vert |
| NO_CAPACITY | weeklyCapacity = 0 | Gris |

**Filtres :** role (dropdown), perimetre projet (dropdown), statut de capacite (boutons). Cartes de synthese avec comptage par statut.

**Source de donnees :** `CapacityService.getCapacityOverview(role?, projectId?)` → `GET /api/capacity`

### Breadcrumb Navigation — `components/breadcrumb/`

Fil d'ariane visible sur toutes les pages sauf login.

```html
<!-- Dans app.html -->
<app-breadcrumb />
```

**BreadcrumbService (`services/breadcrumb-service.ts`) :**
- S'abonne a `NavigationEnd` via `Router`
- `items$` : `BehaviorSubject<BreadcrumbItem[]>` consomme par `BreadcrumbComponent`
- `setDynamicLabel(key, label)` : appelee par les composants de detail apres chargement de l'entite
  - `ProjectDetails` → `setDynamicLabel(String(projectId), project.name)`
  - `TaskDetails` → `setDynamicLabel(String(taskId), task.name)`
  - `PortefeuilleDetails` → `setDynamicLabel(String(pfId), pf.nom)`

**Exemple :**
```
Home > Projects > Core Banking T24 > Gantt
Home > My Tasks
Home > Capacity Planning
```

### canDeactivate — Protection des formulaires — `guards/unsaved-changes.guard.ts`

```typescript
// Composant protege (exemple)
export class ProjectCreate implements HasUnsavedChanges {
  private savedSuccessfully = false;

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.savedSuccessfully;
  }

  onSubmit() {
    // ...apres sauvegarde reussie...
    this.savedSuccessfully = true;
    this.router.navigate(['/projects']);
  }
}
```

Formulaires proteges : `project-create`, `project-edit`, `task-create`, `task-edit`, `user-create`, `user-edit`.

---

## Diagramme de Gantt interactif

Le composant Gantt (`components/gantt/`) est le composant le plus complexe de l'application. Il replique les fonctionnalites cles de MS Project.

### Fonctionnalites

| Fonctionnalite | Description |
|----------------|-------------|
| **Arbre hierarchique** | Taches parent-enfant avec indentation WBS |
| **3 niveaux de zoom** | Jour (36px/jour), Semaine (12px/jour), Mois (3px/jour) |
| **Chemin critique** | Algorithme CPM (Critical Path Method) avec passe avant/arriere |
| **Drag & drop** | Deplacer les barres de tache pour changer les dates |
| **Redimensionnement** | Etirer les barres pour modifier la duree |
| **Baselines** | Affichage des barres de baseline sous les barres actuelles |
| **Collapse/Expand** | Replier/deplier les groupes de taches |
| **Scroll synchronise** | Grille et timeline scrollent ensemble |
| **Splitter** | Redimensionner grille/timeline par drag |
| **Scroll to today** | Bouton pour centrer sur la date du jour |
| **Zoom to fit** | Ajuster le zoom pour voir toutes les taches |
| **Selection** | Cliquer sur une tache pour la selectionner |
| **Edition inline** | Modifier les cellules directement dans la grille |
| **Ajout de taches** | Creer de nouvelles taches depuis le Gantt |
| **Fleches dependances** | Visualisation des liens FS, SS, FF, SF |
| **Week-ends** | Bandes grises pour les week-ends (zoom jour) |
| **Couleurs statut** | Barres colorees selon le statut de la tache |

### Sous-composants

| Composant | Role |
|-----------|------|
| `GanttGrid` | Grille a gauche (colonnes : WBS, Nom, Debut, Fin, Duree, Progression) |
| `GanttTimeline` | Zone graphique des barres de tache et fleches |
| `GanttTimescale` | En-tete temporel (annees/mois, mois/semaines, jours) |

### Utilitaires (`gantt.utils.ts`)

30+ fonctions utilitaires dont :
- **Dates** : `daysBetween`, `addDays`, `startOfDay`, `startOfWeek`, `startOfMonth`, `isWeekend`, `getISOWeek`
- **Hierarchie** : `buildTaskTree`, `flattenTree`
- **Rendu** : `dateToX`, `xToDate`, `computeBar`, `computeArrow`, `generateTimescale`, `generateGridLines`, `getWeekendRanges`
- **Chemin critique** : `computeCriticalPath` (algorithme CPM complet)
- **Couleurs** : `getStatusColor`, `getProgressColor`
- **Formes SVG** : `milestonePath`, `summaryBarPath`

### Constantes visuelles

```
ROW_HEIGHT     = 36px    // Hauteur d'une ligne
BAR_HEIGHT     = 22px    // Hauteur d'une barre de tache
MILESTONE_SIZE = 12px    // Taille du losange milestone
INDENT_PX      = 20px    // Indentation par niveau de hierarchie
```

---

## Composants partages

### ConfirmDialog

Boite de dialogue modale de confirmation.

**Inputs :**
| Input | Type | Description |
|-------|------|-------------|
| `visible` | boolean | Afficher/masquer |
| `title` | string | Titre de la boite |
| `message` | string | Message de confirmation |
| `confirmLabel` | string | Texte du bouton confirmer |
| `cancelLabel` | string | Texte du bouton annuler |

**Outputs :**
| Output | Type | Description |
|--------|------|-------------|
| `confirmed` | EventEmitter | Emis lors de la confirmation |
| `cancelled` | EventEmitter | Emis lors de l'annulation |

### Pagination

Controles de pagination reutilisables.

**Inputs :**
| Input | Type | Description |
|-------|------|-------------|
| `totalItems` | number | Nombre total d'elements |
| `pageSize` | number | Elements par page |
| `currentPage` | number | Page courante |

**Outputs :**
| Output | Type | Description |
|--------|------|-------------|
| `pageChange` | EventEmitter\<number\> | Emis lors du changement de page |

---

## Systeme de design et styles

### Palette de couleurs (BIAT Brand)

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--color-primary` | `#00687B` | Couleur principale (teal fonce) |
| `--color-primary-light` | `#00798f` | Variante claire |
| `--color-primary-dark` | `#004d5a` | Variante foncee |
| `--color-accent` | `#42b7d4` | Couleur d'accent (cyan) |
| `--color-accent-light` | `#5cc5dc` | Accent clair |
| `--color-accent-dark` | `#2ea5bd` | Accent fonce |
| `--color-bg` | `#f8fafb` | Fond de page |
| `--color-surface` | `#ffffff` | Fond de carte |
| `--color-border` | `#e1e8ed` | Bordures |
| `--color-text-primary` | `#1a2633` | Texte principal |
| `--color-text-secondary` | `#5a6c7d` | Texte secondaire |
| `--color-success` | `#10b981` | Succes (vert) |
| `--color-warning` | `#f59e0b` | Avertissement (orange) |
| `--color-error` | `#ef4444` | Erreur (rouge) |
| `--color-info` | `#42b7d4` | Information (cyan) |

### Composants CSS globaux

- **Boutons** : `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`, `.btn-sm`, `.btn-lg`
- **Formulaires** : Inputs stylises avec focus accent, labels, form-group, form-error
- **Cards** : `.card`, `.card-header`, `.card-body`, `.card-footer` avec effet elevation au hover
- **Badges** : `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`, `.badge-primary`
- **Containers** : `.container` (1200px), `.container-sm` (800px)
- **Grid** : `.grid`, `.grid-cols-2`, `.grid-cols-3` (responsive)
- **Utilitaires** : `.text-center`, `.text-muted`, `.flex`, `.gap-md`, `.mt-lg`, etc.
- **Animations** : `fadeIn`, `slideIn`, `pulse`
- **Scrollbar** : Style personnalise (WebKit)

### Design responsive

- **Breakpoint** : 768px
- **Mobile** : Menu hamburger, grilles en colonne unique, footer empile
- **Desktop** : Navigation horizontale, grilles multi-colonnes

---

## Gestion des fichiers projet

La page de details d'un projet (`/projects/:id`) permet de gerer les fichiers :

1. **Selection du sous-dossier** : `fonctions`, `P.V` (proces-verbaux), `contrats`
2. **Upload de fichier** : Selection + envoi via FormData
3. **Liste des fichiers** : Affichage des fichiers existants dans le sous-dossier selectionne

Les fichiers sont stockes sur le serveur backend dans `./projects/<nom-projet>/<sous-dossier>/`.

---

## Import Excel

Le composant `ProjectList` supporte l'import de projets depuis un fichier Excel (`.xlsx`) :

1. L'utilisateur selectionne un fichier Excel
2. La librairie `xlsx` (SheetJS) parse le fichier
3. Chaque ligne est convertie en objet `CreateProjectRequest`
4. Les projets sont crees sequentiellement via l'API
5. La liste est rafraichie apres l'import

**Colonnes Excel attendues :** name, description, startDate, endDate, projectManagerId, etc.

---

## Tests

Framework : **Vitest** (via `@analogjs/vitest-angular`). Ne pas utiliser l'API Jasmine.

### Lancer les tests

```bash
npx vitest run          # execution unique
npx vitest              # mode watch
```

### API Vitest a utiliser

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Spy sur une fonction globale
const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
spy.mockRestore();

// Mock de service
const mockService = { getMyTasks: vi.fn().mockReturnValue(of(data)) };

// Assertions (pas l'API Jasmine)
expect(value).toBe(true);         // PAS toBeTrue()
expect(value).toBe(false);        // PAS toBeFalse()
expect(array).toHaveLength(3);
expect(fn).toHaveBeenCalled();
```

### Suites de tests

| Suite | Fichier | Tests |
|-------|---------|-------|
| MyTasks | `components/my-tasks/my-tasks.spec.ts` | 16 |
| BreadcrumbService | `services/breadcrumb-service.spec.ts` | 7 |
| unsavedChangesGuard | `guards/unsaved-changes.guard.spec.ts` | 4 |
| *(autres suites pre-existantes)* | | ~47 |
| **Total** | | **74** |

---

## Structure des dossiers

```
fr-main/
├── angular.json                          (Configuration Angular CLI)
├── tsconfig.json                         (Configuration TypeScript)
├── tsconfig.app.json                     (Config TS application)
├── tsconfig.spec.json                    (Config TS tests)
├── package.json                          (Dependances et scripts)
├── package-lock.json                     (Lockfile npm)
├── public/
│   └── logo-biat.webp                    (Logo BIAT)
├── src/
│   ├── index.html                        (Page HTML racine)
│   ├── main.ts                           (Bootstrap Angular)
│   ├── styles.css                        (Styles globaux + design system)
│   ├── environments/
│   │   └── environment.ts                (Configuration environnement)
│   └── app/
│       ├── app.ts                        (Composant racine)
│       ├── app.html                      (Template : navbar + outlet + footer)
│       ├── app.css                       (Styles layout principal)
│       ├── app.routes.ts                 (Table de routage)
│       ├── app.config.ts                 (Configuration providers)
│       ├── models/
│       │   ├── project.ts                (ProjectDTO)
│       │   ├── project.requests.ts       (CreateProjectRequest, UpdateProjectRequest)
│       │   ├── task.ts                   (TaskDTO, TaskStatus)
│       │   ├── user.ts                   (UserDTO, Role, CreateUserPayload)
│       │   ├── task-assignment.ts        (TaskAssignmentDTO)
│       │   ├── task-dependency.ts        (TaskDependencyDTO, DependencyType)
│       │   ├── portefeuille.ts           (PortefeuilleDTO, PortefeuilleCreateUpdateRequest)
│       │   ├── my-task.ts                (MyTaskDTO — Wave 1)
│       │   └── resource-capacity.ts      (ResourceCapacityDTO — Wave 1)
│       ├── services/
│       │   ├── project-service.ts        (CRUD projets)
│       │   ├── task-service.ts           (CRUD taches)
│       │   ├── user-service.ts           (CRUD utilisateurs)
│       │   ├── task-assignment-service.ts (Affectations + getMyTasks())
│       │   ├── task-dependency-service.ts (Dependances)
│       │   ├── portefeuille-service.ts   (Portefeuilles)
│       │   ├── file-service.ts           (Upload/liste fichiers)
│       │   ├── capacity-service.ts       (Capacity Planning — Wave 1)
│       │   └── breadcrumb-service.ts     (Fil d'ariane — Wave 1)
│       ├── guards/
│       │   ├── auth-guard.ts             (Redirection login si non authentifie)
│       │   ├── role-guard.ts             (Protection RBAC par role)
│       │   └── unsaved-changes.guard.ts  (Dialog confirmation — Wave 1)
│       └── components/
│           ├── home/                     (Page d'accueil)
│           ├── project-list/             (Liste des projets)
│           ├── project-create/           (Creation projet, canDeactivate)
│           ├── project-details/          (Details + fichiers + setDynamicLabel)
│           ├── project-edit/             (Edition projet, canDeactivate)
│           ├── gantt/                    (Diagramme de Gantt)
│           ├── portefeuille-list/        (Liste portefeuilles)
│           ├── portefeuille-details/     (Details portefeuille + setDynamicLabel)
│           ├── task-list/                (Liste taches)
│           ├── task-create/              (Creation tache, canDeactivate)
│           ├── task-details/             (Details tache + setDynamicLabel)
│           ├── task-edit/                (Edition tache, canDeactivate)
│           ├── task-assignments/         (Affectations)
│           ├── task-dependencies/        (Dependances)
│           ├── user-list/                (Liste utilisateurs)
│           ├── user-create/              (Creation utilisateur, canDeactivate)
│           ├── user-edit/                (Edition utilisateur, canDeactivate)
│           ├── confirm-dialog/           (Dialog confirmation)
│           ├── pagination/               (Pagination)
│           ├── breadcrumb/               (Fil d'ariane — Wave 1)
│           ├── my-tasks/                 (Tableau de bord personnel — Wave 1)
│           └── capacity-planning/        (Vue de charge ressources — Wave 1)
└── dist/                                 (Build output)
```

---

## Build et deploiement

### Build de production

```bash
npm run build
```

Les fichiers sont generes dans `dist/ppm_front/browser/`.

### Serveur de developpement avec watch

```bash
npm run watch
```

---

## Scripts disponibles

| Script | Commande | Description |
|--------|----------|-------------|
| `start` | `ng serve` | Demarrer en mode developpement (port 4200) |
| `build` | `ng build` | Build de production |
| `watch` | `ng build --watch --configuration development` | Build avec surveillance |
| `test` | `ng test` | Lancer les tests unitaires |

---

## Metriques du projet

| Metrique | Valeur |
|----------|--------|
| Composants Angular | 22 (dont 3 sous-composants Gantt, +3 Wave 1) |
| Services HTTP | 9 (+2 Wave 1) |
| Modeles TypeScript | 9 fichiers (+2 Wave 1) |
| Guards de navigation | 3 (+1 Wave 1) |
| Routes | 19 (+2 Wave 1) |
| Composants partages | 2 (ConfirmDialog, Pagination) |
| Fonctions utilitaires Gantt | 30+ |
| Tests Vitest | 74 (+27 Wave 1) |
| Fichiers source total | ~90+ |

---

## Historique des versions

| Version | Date | Contenu |
|---------|------|---------|
| Wave 0 | Initial | Auth JWT, Projets, Taches, Gantt, WBS, Dependances, Affectations, Portefeuilles |
| Wave 1 | 2026-04-13 | My Tasks Dashboard, Resource Capacity Planning, Breadcrumb Navigation, canDeactivate |
| Wave 2 | 2026-04-14 | Audit Trail, Notifications Center, Portfolio Executive Dashboard, Notification Bell |

---

## Wave 2 — Features

### Audit Trail (`/audit`)
- Paginated table with server-side pagination (Spring `Page<T>`)
- Filters: entity type, action, date range (from/to)
- Color-coded action badges (CREATE=green, DELETE=red, STATUS_CHANGE=amber, etc.)
- RBAC: `ADMIN`, `PMO`, `PM` only
- Service: `AuditService` → `GET /api/audit`

### Notifications Center (`/notifications`)
- Real-time bell icon in navbar with unread badge (polls every 30 s)
- Tabs: All / Unread
- Per-notification: mark as read (click row or button), delete
- Bulk: Mark all as read
- Relative timestamps ("5m ago", "2d ago", etc.)
- RBAC: all authenticated users
- Service: `NotificationService` → `GET/PUT/DELETE /api/notifications/*`

### Portfolio Executive Dashboard (`/portfolio-dashboard`)
- 8 KPI cards: Portfolios, Active Projects, On Track, At Risk, Delayed, Avg Progress, Active Tasks, Overdue Tasks
- 3 Chart.js charts: tasks by status (doughnut), project health distribution (pie), projects per portfolio (bar)
- Project health table with color-coded health badges and progress bars
- Portfolio summary cards with per-portfolio breakdown
- Search + health status filter on table
- RBAC: `ADMIN`, `PMO`, `PM` only
- Service: `DashboardService.getPortfolioDashboard()` → `GET /api/dashboard/portfolio`

### New Routes
| Route | Component | Guard |
|-------|-----------|-------|
| `/audit` | `AuditLogList` | `roleGuard('ADMIN','PMO','PM')` |
| `/notifications` | `NotificationCenter` | `authGuard` |
| `/portfolio-dashboard` | `PortfolioDashboard` | `roleGuard('ADMIN','PMO','PM')` |

### Navbar changes
- Added **Dashboard**, **Audit** nav links (ADMIN/PMO/PM)
- Added **notification bell** with live unread badge (all authenticated users)
