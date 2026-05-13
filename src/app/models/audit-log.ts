/**
 * Modeles pour le journal d'audit (Wave 2).
 * Correspond au backend AuditLogDTO, AuditAction enum et PageResponse.
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'DEPENDENCY_ADD'
  | 'DEPENDENCY_REMOVE';

export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'ASSIGN',
  'UNASSIGN',
  'DEPENDENCY_ADD',
  'DEPENDENCY_REMOVE',
];

export const AUDIT_ENTITY_TYPES: string[] = [
  'PROJECT',
  'TASK',
  'USER',
  'ASSIGNMENT',
  'DEPENDENCY',
  'PORTFOLIO',
];

export interface AuditLogDTO {
  id: number;
  actorId: number | null;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: number;
  entityName: string;
  details: string;
  projectId: number | null;
  projectName: string | null;
  timestamp: string; // ISO datetime string
}

export interface AuditSearchParams {
  entityType?: string;
  actorId?: number | null;
  action?: AuditAction | '';
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

/** Reponse paginee Spring (Page<T>) */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // page courante (0-based)
  size: number;
  first: boolean;
  last: boolean;
}
