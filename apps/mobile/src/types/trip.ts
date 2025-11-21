/**
 * Core Trip domain type
 */
export type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  updatedAt: number;
};
