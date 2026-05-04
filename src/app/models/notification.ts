/**
 * Modeles pour le centre de notifications (Wave 2).
 * Correspond au backend NotificationDTO et NotificationType enum.
 */

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  | 'OVERLOAD_WARNING'
  | 'PROJECT_UPDATE'
  | 'DEPENDENCY_BLOCKED';

export interface NotificationDTO {
  id: number;
  recipientId: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  entityType: string | null;
  entityId: number | null;
  createdAt: string; // ISO datetime string
}