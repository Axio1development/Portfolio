import TaskPricing from "./TaskPricing";
import { Check, X } from "lucide-react";
import type { Task, TeamMember, BoardColumn } from "./types";
import { statuses } from "./types";
export default function TaskEditor({
  editing,
  setEditing,
  tasks,
  error,
  busy,
  save,
  remove,
  members,
  canManage,
  canWork,
  canChangeStatus,
  children,
  requiresReview,
  boardColumns,
  termsLocked,
}: {
  requiresReview: boolean;
  termsLocked: boolean;
  boardColumns: BoardColumn[];
  members: TeamMember[];
  canManage: boolean;
  canWork: boolean;
  canChangeStatus: boolean;
  children?: React.ReactNode;
  editing: Task;
  setEditing: React.Dispatch<React.SetStateAction<Task | null>>;
  tasks: Task[];
  error: string;
  busy: boolean;
  save: (e: React.FormEvent) => void;
  remove: (t: Task) => void;
}) {
  return (
    <div className="modal-backdrop">
      <form
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Task editor"
        onSubmit={save}
      >
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <header>
          <div>
            <span className="eyebrow">MY WORKSPACE</span>
            <h2>
              {tasks.some((t) => t.id === editing.id)
                ? "Task details"
                : "Create a task"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setEditing(null)}
          >
            <X size={22} />
          </button>
        </header>
        <label>
          Task name
          <input
            disabled={!canManage}
            required
            autoFocus
            maxLength={150}
            placeholder="What needs to happen?"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            disabled={!canManage}
            placeholder="Add a little context…"
            value={editing.description}
            onChange={(e) =>
              setEditing({ ...editing, description: e.target.value })
            }
          />
        </label>
        {!canChangeStatus && (
          <p className="collaboration-caption">
            Task status is managed by the Workspace Owner, Studio Director, or
            Studio Manager. You can submit your work for review below.
          </p>
        )}
        <div className="form-grid">
          <label>
            Status
            <select
              aria-label="Status"
              disabled={!canChangeStatus}
              value={editing.status}
              onChange={(e) =>
                setEditing({ ...editing, status: e.target.value })
              }
            >
              {statuses.map((s) => (
                <option
                  key={s}
                  disabled={
                    s === "Done" && (!canChangeStatus || requiresReview)
                  }
                >
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              disabled={!canManage}
              value={editing.priority}
              onChange={(e) =>
                setEditing({ ...editing, priority: e.target.value })
              }
            >
              {["Low", "Medium", "High"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              disabled={!canManage}
              type="date"
              value={editing.due}
              onChange={(e) => setEditing({ ...editing, due: e.target.value })}
            />
          </label>
          <label>
            Assigned individual
            <select
              disabled={!canManage}
              value={editing.assigneeId || ""}
              onChange={(e) => {
                const member = members.find(
                  (item) => item.id === e.target.value,
                );
                setEditing({
                  ...editing,
                  assigneeId: e.target.value,
                  assignee: member?.name || "",
                });
              }}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} (
                  {member.role === "workspace_owner"
                    ? "Studio Owner"
                    : member.role.replaceAll("_", " ")}
                  )
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="task-column-field">
          <label>
            Task column
            <select
              aria-label="Task column"
              disabled={!canManage}
              value={editing.columnId || ""}
              onChange={(e) =>
                setEditing({ ...editing, columnId: e.target.value })
              }
            >
              {boardColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TaskPricing
          task={editing}
          onChange={setEditing}
          canManage={canManage}
          locked={termsLocked}
        />
        <label>
          Checklist · one item per line
          <textarea
            disabled={!canManage}
            placeholder="Define the first step…"
            value={editing.checklist}
            onChange={(e) =>
              setEditing({ ...editing, checklist: e.target.value })
            }
          />
        </label>
        {editing.checklist && (
          <div className="check-items">
            {editing.checklist
              .split("\n")
              .filter(Boolean)
              .map((item, i) => (
                <label key={i}>
                  <input
                    disabled={!canWork}
                    type="checkbox"
                    checked={editing.checks?.includes(item) || false}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        checks: e.target.checked
                          ? [...(editing.checks || []), item]
                          : (editing.checks || []).filter((x) => x !== item),
                      })
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
          </div>
        )}
        {requiresReview && canChangeStatus && (
          <p className="review-completion-hint">
            Review the latest submission below to approve completion or send
            feedback.
          </p>
        )}
        {children}
        <footer>
          {canManage && tasks.some((t) => t.id === editing.id) && (
            <button
              className="delete"
              type="button"
              onClick={() => remove(editing)}
            >
              Delete task
            </button>
          )}
          {(canWork || canChangeStatus) && (
            <button className="primary" type="submit" disabled={busy}>
              <Check size={16} />
              Save task
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
