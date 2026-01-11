
export interface Employee {
  id: string;
  user_id: string;
  name: string;
  hourly_rate: number;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  employee_id: string;
  date: string;
  time_in: string;
  time_out: string | null;
  created_at: string;
  employee?: Employee; // Joined data
}

export interface WageSummary {
  totalHours: number;
  totalWages: number;
  count: number;
}
