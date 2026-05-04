export interface WeekSlot {
  weekLabel: string;
  /** ISO-8601 Monday — e.g. "2026-04-07" */
  weekStart: string;
  /** ISO-8601 Friday — e.g. "2026-04-11" */
  weekEnd: string;
  assignedHours: number;
  /** weeklyCapacity - assignedHours (negative = overload) */
  availableHours: number;
  utilizationPct: number;
  /** OVERLOADED | BALANCED | UNDERUTILIZED | NO_CAPACITY */
  status: string;
}

export interface WeeklyCapacityDTO {
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  weeklyCapacity: number;
  weeks: WeekSlot[];
}
