import { useState } from "react";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Task, TaskClockApproval } from "./types";
import { money, hoursLabel } from "./pricing";
export default function TaskClockAuthorization({
  task,
  approval,
  canAuthorize,
  hasUnsavedChanges,
  onChange,
}: {
  task: Task;
  approval: TaskClockApproval | undefined;
  canAuthorize: boolean;
  hasUnsavedChanges: boolean;
  onChange: (action: string, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const valid = Boolean(
    approval?.active &&
    approval.assigneeId === task.assigneeId &&
    approval.plannedMinutes === task.plannedMinutes &&
    approval.hourlyRateCents === task.hourlyRateCents &&
    ["Backlog", "In progress"].includes(task.status),
  );
  const ready =
    task.pricingMode === "hourly" &&
    Boolean(task.assigneeId) &&
    (task.plannedMinutes || 0) > 0 &&
    ["Backlog", "In progress"].includes(task.status) &&
    !task.termsPending;
  async function change(action: string) {
    setError("");
    if (action === "revokeTaskClock" && !note.trim()) {
      setError("Add a reason for revoking clock-in approval.");
      return;
    }
    setBusy(true);
    try {
      await onChange(action, note);
      setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="task-clock-authorization">
      <h3>
        <ShieldCheck size={16} />
        Clock-in authorization
        <span className={"clock-auth-status " + (valid ? "approved" : "")}>
          {valid ? "Approved" : "Approval required"}
        </span>
      </h3>
      <p>
        An assigned hourly task must be authorized by the workspace owner,
        Studio Director, or Studio Manager before time and rate tracking can
        start.
      </p>
      {valid && approval ? (
        <div className="clock-approved-details">
          <Check size={15} />
          <div>
            <strong>
              {hoursLabel(approval.plannedMinutes)} planned hours at{" "}
              {money(approval.hourlyRateCents)}/hour
            </strong>
            <small>
              Approved by {approval.approvedBy} /{" "}
              {new Date(approval.approvedAt).toLocaleString()}
            </small>
            {approval.note && <p>{approval.note}</p>}
          </div>
        </div>
      ) : (
        <div className="clock-approval-needed">
          <LockKeyhole size={15} />
          <span>
            {task.termsPending
              ? "Resolve the pending hours/rate proposal before clock-in can be approved."
              : ready
                ? "This task is not authorized for clock-in yet."
                : "Clock approval requires an assigned hourly task with planned hours, in Backlog or In progress."}
          </span>
        </div>
      )}
      {hasUnsavedChanges && canAuthorize && (
        <p className="clock-save-first">
          Save task changes before updating clock-in approval.
        </p>
      )}
      {canAuthorize && (
        <>
          <label>
            Clock approval note{" "}
            <span>{valid ? "(required to revoke)" : "(optional)"}</span>
            <textarea
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                valid
                  ? "Explain why clock-in permission is being removed."
                  : "Add an instruction for the approved work."
              }
            />
          </label>
          <button
            type="button"
            className={valid ? "secondary" : "primary"}
            disabled={busy || hasUnsavedChanges || (!valid && !ready)}
            onClick={() =>
              change(valid ? "revokeTaskClock" : "authorizeTaskClock")
            }
          >
            {busy
              ? "Saving..."
              : valid
                ? "Revoke clock approval"
                : "Approve task for clock-in"}
          </button>
          {valid && (
            <small className="clock-revoke-note">
              Revoking approval also clocks out any active session for this
              task.
            </small>
          )}
        </>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
