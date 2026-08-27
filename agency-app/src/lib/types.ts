export type UserRole = "owner" | "admin" | "member" | "client";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  weekly_capacity_hours: number;
}

export interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface ClientAdGoals {
  client_id: string;
  monthly_budget: number | null;
  target_roas: number | null;
  target_cpa: number | null;
  revenue_goal: number | null;
}

export type AdPlatform = "meta" | "google";
