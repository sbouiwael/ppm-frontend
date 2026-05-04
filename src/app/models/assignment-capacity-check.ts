export interface WeekCapacityDetail {
  weekStart: string;
  weekEnd: string;
  weeklyCapacity: number;
  alreadyAssignedHours: number;
  newTaskHoursForWeek: number;
  projectedAssignedHours: number;
  availableHoursAfterAssignment: number;
  /** AVAILABLE | NEAR_CAPACITY | OVERLOADED | NO_CAPACITY */
  status: string;
  overloadHours: number;
}

export interface AssignmentCapacityCheckDTO {
  userId: number;
  userName: string;
  taskId: number;
  taskName: string;
  weeks: WeekCapacityDetail[];
  canAssign: boolean;
  hasOverload: boolean;
  message: string;
}
