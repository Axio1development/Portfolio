export type PlanId = "starter" | "pro" | "business";
export type Account = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: PlanId | "";
};
export type Task = {
  termsPending?: boolean;
  pricingMode?: "fixed" | "hourly";
  plannedMinutes?: number;
  hourlyRateCents?: number;
  boardId?: string | null;
  columnId?: string | null;
  priceCents?: number;
  revision?: number;
  checks?: string[];
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due: string;
  assignee: string;
  assigneeId?: string;
  checklist: string;
};
export type Activity = { actor: string; message: string; created: string };
export const statuses = ["Backlog", "In progress", "In review", "Done"];

export type ProjectWorkspace = {
  canManage: boolean;
  id: string;
  name: string;
  description: string;
  created: string;
};
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};
export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires: number;
  created: string;
};
export type Submission = {
  reviewStatus: "pending" | "approved" | "denied" | "changes_requested";
  reviewNote: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  id: string;
  taskId: string;
  userId: string;
  filename: string;
  bytes: number;
  note: string;
  created: string;
  submittedBy: string;
};
export type Invitation = {
  email: string;
  role: string;
  expires: number;
  acceptedBy: string | null;
  workspaceName: string;
  invitedBy: string;
};
export type BoardColumn = { id: string; name: string; position: number };
export type ProjectBoard = {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
  columns: BoardColumn[];
  totalPriceCents: number;
};
export type TimeSession = {
  task_id: string | null;
  task_title: string;
  hourly_rate_cents: number | null;
  planned_minutes: number | null;
  trackedCents: number | null;
  id: string;
  workspace_id: string;
  board_id: string;
  user_id: string;
  started_at: number;
  ended_at: number | null;
  revision: number;
  name?: string;
  email?: string;
  boardName?: string;
};
export type TimeEvent = {
  id?: number;
  sessionId: string;
  action: string;
  reason: string;
  created: number;
  editor: string;
  member?: string;
  beforeJson?: string;
  afterJson?: string;
};
export type TaskOffer = {
  id: string;
  taskId: string;
  proposerId: string;
  recipientId: string;
  assigneeId: string;
  plannedMinutes: number;
  hourlyRateCents: number;
  message: string;
  status: "pending" | "accepted" | "declined" | "superseded" | "cancelled";
  decisionNote: string;
  created: string;
  decidedAt: string | null;
  proposer: string;
  recipient: string;
  decidedBy: string | null;
};
export type TaskClockApproval = {
  taskId: string;
  assigneeId: string;
  plannedMinutes: number;
  hourlyRateCents: number;
  active: number;
  note: string;
  approvedAt: string;
  revokedAt: string | null;
  approvedBy: string;
};
export type EligibleClockTask = {
  id: string;
  title: string;
  plannedMinutes: number;
  hourlyRateCents: number;
  approvedBy: string;
  approvedAt: string;
};
