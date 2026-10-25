import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Eye,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Brand from "./Brand";
import { demoTasks } from "./demo-data";
import type { DemoTask } from "./demo-data";
import { statuses } from "./types";
const date = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
function TaskDetails({
  task,
  onClose,
}: {
  task: DemoTask;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="task-preview"
      onCancel={onClose}
      aria-label="Sample task details"
    >
      <header>
        <span className="eyebrow">WEBSITE LAUNCH / SAMPLE TASK</span>
        <button autoFocus aria-label="Close task details" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      <span className={"task-label label-" + task.label.toLowerCase()}>
        {task.label}
      </span>
      <h2>{task.title}</h2>
      <div className="detail-badges">
        <span className="pill">{task.status}</span>
        <span className={"priority " + task.priority.toLowerCase()}>
          {task.priority} priority
        </span>
      </div>
      <dl className="demo-detail-meta">
        <div>
          <dt>Assignee</dt>
          <dd>
            <span className="avatar">
              {task.assignee
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            {task.assignee}
          </dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>
            <CalendarDays size={15} />
            {date(task.due)}
          </dd>
        </div>
      </dl>
      <section>
        <h3>Description</h3>
        <p>{task.description}</p>
      </section>
      <section>
        <h3>
          Checklist{" "}
          <span>
            {task.checks?.length || 0}/{task.checklist.split("\n").length}
          </span>
        </h3>
        <div className="demo-checklist">
          {task.checklist.split("\n").map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                disabled
                checked={task.checks?.includes(item) || false}
                readOnly
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>
      <footer>
        <LockKeyhole size={14} />
        <span>This is a read-only sample. Task details cannot be changed.</span>
      </footer>
    </dialog>
  );
}
export default function Preview({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState("Board"),
    [query, setQuery] = useState(""),
    [priority, setPriority] = useState("All priorities"),
    [selected, setSelected] = useState<DemoTask | null>(null);
  const filtered = demoTasks.filter(
    (task) =>
      (
        task.title +
        " " +
        task.description +
        " " +
        task.assignee +
        " " +
        task.label
      )
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (priority === "All priorities" || task.priority === priority),
  );
  const open = (task: DemoTask) => setSelected(task);
  return (
    <div className="demo-shell">
      <div className="demo-banner">
        <span>
          <Eye size={16} />
          <strong>Portfolio demo</strong>
          <i />
          Read-only workspace with sample data
        </span>
        <button onClick={onExit}>
          Back to sign in
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="workspace demo-workspace">
        <aside className="sidebar">
          <Brand />
          <div className="workspace-select">
            <span className="project-icon">
              <FolderKanban size={21} />
            </span>
            <div>
              <strong>Studio workspace</strong>
              <small>Sample project</small>
            </div>
            <LockKeyhole size={13} />
          </div>
          <span className="nav-label">WORKSPACE</span>
          <button
            className={"nav-item " + (tab === "Board" ? "active" : "")}
            onClick={() => setTab("Board")}
          >
            <LayoutDashboard size={18} />
            Board
          </button>
          <button
            className={"nav-item " + (tab === "List" ? "active" : "")}
            onClick={() => setTab("List")}
          >
            <ListTodo size={18} />
            Task list
          </button>
          <div className="sidebar-project">
            <span className="nav-label">PROJECT</span>
            <span>
              <span className="project-color" />
              Website launch
            </span>
            <span className="sidebar-caption">
              A sample of work in progress.
            </span>
          </div>
          <div className="sidebar-bottom">
            <div className="demo-sidebar-note">
              <ShieldCheck size={20} />
              <strong>Explore with confidence</strong>
              <p>
                Browse the board, filter tasks, and open a card to see the
                details. This demo is view-only.
              </p>
            </div>
            <button className="nav-item" onClick={onExit}>
              <ArrowLeft size={17} />
              Back to sign in
            </button>
            <div className="profile">
              <span className="avatar">V</span>
              <div>
                <strong>Visitor</strong>
                <small>Read-only access</small>
              </div>
            </div>
          </div>
        </aside>
        <main className="content">
          <header className="topbar">
            <span className="breadcrumb">
              Studio workspace
              <ChevronRight size={14} />
              Website launch
            </span>
            <span className="pill">
              <LockKeyhole size={12} />
              View only
            </span>
          </header>
          <div className="page-heading">
            <span className="eyebrow">PROJECT WORKSPACE</span>
            <div className="heading-row">
              <div>
                <h1>
                  Website launch<span className="project-status">On track</span>
                </h1>
                <p>
                  A clear plan. A shared direction. Everything ready for launch.
                </p>
              </div>
              <div className="sample-team">
                <div>
                  {["AL", "JK", "MR"].map((name, i) => (
                    <span key={name} className={"avatar team-" + i}>
                      {name}
                    </span>
                  ))}
                </div>
                <span>Sample team</span>
              </div>
            </div>
          </div>
          <div className="metrics demo-metrics">
            {[
              ["Total tasks", "8", "Across this project"],
              ["In progress", "2", "Active work"],
              ["In review", "2", "Ready for feedback"],
              ["Completed", "2", "25% of the project"],
            ].map(([label, count, caption], i) => (
              <div className="metric" key={label}>
                <span>
                  {label}
                  <i className={"dot dot-" + i} />
                </span>
                <strong>{count}</strong>
                <small>{caption}</small>
              </div>
            ))}
          </div>
          <div className="board-title">
            <h2>
              Project board<span>{demoTasks.length}</span>
            </h2>
            <span className="demo-hint">
              <Eye size={14} />
              Open a card to explore
            </span>
          </div>
          <div className="toolbar">
            <div className="view-tabs">
              <button
                className={tab === "Board" ? "selected" : ""}
                onClick={() => setTab("Board")}
              >
                <LayoutDashboard size={15} />
                Board
              </button>
              <button
                className={tab === "List" ? "selected" : ""}
                onClick={() => setTab("List")}
              >
                <ListTodo size={15} />
                List
              </button>
            </div>
            <div className="tools">
              <label className="search">
                <Search size={16} />
                <input
                  aria-label="Search sample tasks"
                  placeholder="Search tasks..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="filter">
                <SlidersHorizontal size={15} />
                <select
                  aria-label="Filter sample priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {["All priorities", "High", "Medium", "Low"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button
                className="primary demo-create"
                disabled
                title="Creating tasks is disabled in this read-only demo"
              >
                <Plus size={16} />
                Create task
              </button>
            </div>
          </div>
          {tab === "Board" ? (
            <div className="kanban">
              {statuses.map((status, i) => (
                <section className="column" key={status}>
                  <header>
                    <span>
                      <i className={"dot dot-" + i} />
                      {status}
                      <small>
                        {
                          filtered.filter((task) => task.status === status)
                            .length
                        }
                      </small>
                    </span>
                    <LockKeyhole size={13} className="column-lock" />
                  </header>
                  <div className="column-tasks">
                    {filtered
                      .filter((task) => task.status === status)
                      .map((task) => (
                        <button
                          className="task-card sample-card"
                          key={task.id}
                          onClick={() => open(task)}
                          draggable={false}
                        >
                          {task.cover && (
                            <div className="card-cover">
                              <FolderKanban size={29} />
                              <span>Build with purpose.</span>
                            </div>
                          )}
                          <span
                            className={
                              "task-label label-" + task.label.toLowerCase()
                            }
                          >
                            {task.label}
                          </span>
                          <h3>{task.title}</h3>
                          <span
                            className={
                              "priority " + task.priority.toLowerCase()
                            }
                          >
                            {task.priority} priority
                          </span>
                          <footer>
                            <span>
                              <CalendarDays size={13} />
                              {date(task.due)}
                            </span>
                            <span className="check-count">
                              <CheckSquare size={13} />
                              {task.checks?.length || 0}/
                              {task.checklist.split("\n").length}
                            </span>
                            <span className="avatar" title={task.assignee}>
                              {task.assignee
                                .split(" ")
                                .map((name) => name[0])
                                .join("")}
                            </span>
                          </footer>
                        </button>
                      ))}
                    {!filtered.some((task) => task.status === status) && (
                      <div className="empty-column">
                        <Search size={20} />
                        <p>No matching tasks</p>
                      </div>
                    )}
                  </div>
                  <div className="column-readonly">
                    <LockKeyhole size={12} />
                    View only
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="panel sample-list">
              <div className="list-row list-heading">
                <span>Task</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Due date</span>
              </div>
              {filtered.map((task) => (
                <button
                  key={task.id}
                  className="list-row"
                  onClick={() => open(task)}
                >
                  <span>{task.title}</span>
                  <span>{task.status}</span>
                  <span>
                    <i className={"priority " + task.priority.toLowerCase()}>
                      {task.priority}
                    </i>
                  </span>
                  <span>{date(task.due)}</span>
                </button>
              ))}
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={25} />
                  <h3>No matching tasks</h3>
                  <p>Try another search or priority.</p>
                </div>
              )}
            </section>
          )}
          <footer className="content-footer">
            <span>
              <Check size={13} />
              Board, list, priorities, due dates, and checklists.
            </span>
            <span>SAMPLE PROJECT / VIEW ONLY</span>
          </footer>
        </main>
      </div>
      {selected && (
        <TaskDetails task={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
