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

export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "archived";

export interface Project {
  id: string;
  space_id: string | null;
  client_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  created_at: string;
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  position: number;
  client_visible: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  client_visible: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_type: string;
  storage_path: string;
  is_deliverable: boolean;
  approval_status: "pending" | "approved" | "changes_requested";
  created_at: string;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Por hacer",
  in_progress: "En curso",
  in_review: "En revisión",
  done: "Hecho",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planificación",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};
