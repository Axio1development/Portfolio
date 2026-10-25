import { hoursLabel } from "./pricing";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import ClockPanel from "./ClockPanel";
import ManagementPanel from "./ManagementPanel";
import type { WorkspaceApi } from "./ClockPanel";
import type { BoardColumn, ProjectBoard, Task } from "./types";
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export default function BoardHub({
  workspaceId,
  tasks,
  tab,
  setTab,
  canManage,
  canAdminTime,
  api,
  onCreate,
  onEdit,
  onMove,
  onRefresh,
}: {
  workspaceId: string;
  tasks: Task[];
  tab: string;
  setTab: (tab: string) => void;
  canManage: boolean;
  canAdminTime: boolean;
  api: WorkspaceApi;
  onCreate: (board: ProjectBoard, column: BoardColumn) => void;
  onEdit: (task: Task, board: ProjectBoard) => void;
  onMove: (task: Task) => Promise<boolean>;
  onRefresh: () => Promise<any>;
}) {
  const [boards, setBoards] = useState<ProjectBoard[]>([]),
    [boardId, setBoardId] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [priority, setPriority] = useState("All priorities"),
    [form, setForm] = useState<"board" | "column" | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  async function load(select?: string) {
    try {
      const data = await api("boards", { workspaceId });
      setBoards(data.boards);
      const saved =
        select || localStorage.getItem("axiomate.board." + workspaceId);
      const id =
        data.boards.find((item: ProjectBoard) => item.id === saved)?.id ||
        data.boards[0]?.id ||
        "";
      setBoardId(id);
      if (id) localStorage.setItem("axiomate.board." + workspaceId, id);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [workspaceId]);
  const board = boards.find((item) => item.id === boardId);
  const boardTasks = tasks.filter((task) => task.boardId === boardId);
  const sorted = boardTasks
    .filter(
      (task) =>
        (task.title + " " + task.description + " " + task.assignee)
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (priority === "All priorities" || task.priority === priority),
    )
    .sort(
      (a, b) =>
        (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31") ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    );
  const total = boardTasks.reduce(
    (sum, task) => sum + (task.priceCents || 0),
    0,
  );
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const action = form === "board" ? "createBoard" : "createColumn";
      const data = await api(action, {
        workspaceId,
        boardId,
        name,
        description,
      });
      await load(form === "board" ? data.id : boardId);
      await onRefresh();
      setForm(null);
      setName("");
      setDescription("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openForm(value: "board" | "column") {
    setName("");
    setDescription("");
    setError("");
    setForm(value);
  }
  async function renameColumn(column: BoardColumn) {
    const value = prompt("Column name:", column.name);
    if (!value?.trim()) return;
    try {
      await api("renameColumn", {
        workspaceId,
        boardId,
        columnId: column.id,
        name: value,
      });
      await load(boardId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function removeColumn(column: BoardColumn) {
    if (!confirm("Delete this empty column?")) return;
    try {
      await api("deleteColumn", { workspaceId, boardId, columnId: column.id });
      await load(boardId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (loading)
    return (
      <section className="panel">
        <p className="collaboration-caption">Loading your boards...</p>
      </section>
    );
  return (
    <div className="board-hub">
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!boards.length ? (
        <section className="panel empty-board">
          <span className="empty-board-icon">
            <FolderKanban size={32} />
          </span>
          <h2>{canManage ? "Create your first board." : "No boards yet."}</h2>
          <p>
            {canManage
              ? "Give a project its own board, then add the task columns that fit your work."
              : "Your workspace owner will create the project boards."}
          </p>
          {canManage && (
            <button className="primary" onClick={() => openForm("board")}>
              <Plus size={16} />
              Create board
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="board-directory" aria-label="Project boards">
            <header>
              <div>
                <span className="eyebrow">YOUR PROJECTS</span>
                <h2>
                  Boards <span>{boards.length}</span>
                </h2>
                <p>
                  Choose a board to open its tasks, time clock, and management
                  tools.
                </p>
              </div>
              {canManage && (
                <button className="secondary" onClick={() => openForm("board")}>
                  <Plus size={15} />
                  New board
                </button>
              )}
              <div className="board-cost">
                <span>SELECTED BOARD TOTAL / USD</span>
                <strong>{money(total)}</strong>
                <small>{board?.name}</small>
              </div>
            </header>
            <div className="board-card-grid">
              {boards.map((item) => {
                const items = tasks.filter((task) => task.boardId === item.id);
                const amount = items.reduce(
                  (sum, task) => sum + (task.priceCents || 0),
                  0,
                );
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={
                      "board-choice " + (item.id === boardId ? "selected" : "")
                    }
                    aria-label={"Open board " + item.name}
                    aria-pressed={item.id === boardId}
                    onClick={() => {
                      setBoardId(item.id);
                      localStorage.setItem(
                        "axiomate.board." + workspaceId,
                        item.id,
                      );
                      setQuery("");
                      setPriority("All priorities");
                    }}
                  >
                    <div className="board-choice-top">
                      <span className="board-choice-icon">
                        <FolderKanban size={20} />
                      </span>
                      {item.id === boardId && (
                        <span className="board-choice-selected">Selected</span>
                      )}
                    </div>
                    <h3>{item.name}</h3>
                    {item.description && <p>{item.description}</p>}
                    <footer>
                      <span>
                        {items.length} {items.length === 1 ? "task" : "tasks"} /{" "}
                        {item.columns.length}{" "}
                        {item.columns.length === 1 ? "column" : "columns"}
                      </span>
                      <strong>{money(amount)}</strong>
                    </footer>
                  </button>
                );
              })}
            </div>
          </section>
          {board && (
            <>
              {tab === "Clock" ? (
                <ClockPanel
                  key={board.id}
                  board={board}
                  workspaceId={workspaceId}
                  api={api}
                />
              ) : tab === "Management" ? (
                canAdminTime ? (
                  <ManagementPanel
                    key={board.id}
                    board={board}
                    workspaceId={workspaceId}
                    api={api}
                  />
                ) : (
                  <div className="error" role="alert">
                    You do not have access to board management.
                  </div>
                )
              ) : (
                <>
                  <div className="board-title">
                    <h2>
                      {board.name}
                      <span>{boardTasks.length}</span>
                    </h2>
                    <span className="due-sort">
                      <CalendarDays size={13} />
                      Earliest due date first
                    </span>
                  </div>
                  {board.description && (
                    <p className="board-description">{board.description}</p>
                  )}
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
                      <button onClick={() => setTab("Clock")}>
                        <Clock size={15} />
                        Clock in
                      </button>
                    </div>
                    <div className="tools">
                      <label className="search">
                        <Search size={16} />
                        <input
                          aria-label="Search tasks"
                          placeholder="Search tasks..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <label className="filter">
                        <SlidersHorizontal size={15} />
                        <select
                          aria-label="Filter priority"
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                        >
                          {["All priorities", "High", "Medium", "Low"].map(
                            (value) => (
                              <option key={value}>{value}</option>
                            ),
                          )}
                        </select>
                      </label>
                      {canManage && board.columns.length > 0 && (
                        <button
                          className="primary"
                          onClick={() => onCreate(board, board.columns[0])}
                        >
                          <Plus size={16} />
                          Create task
                        </button>
                      )}
                    </div>
                  </div>
                  {!board.columns.length ? (
                    <section className="panel empty-columns">
                      <h3>Your board, your workflow.</h3>
                      <p>
                        Create a column such as Development, Voice work, or
                        Testing to start organizing tasks.
                      </p>
                      {canManage && (
                        <button
                          className="primary"
                          onClick={() => openForm("column")}
                        >
                          <Plus size={16} />
                          Add first column
                        </button>
                      )}
                    </section>
                  ) : tab === "List" ? (
                    <section className="panel priced-task-list">
                      <div className="priced-list-row list-heading">
                        <span>Task</span>
                        <span>Due date</span>
                        <span>Assignee</span>
                        <span>Price / USD</span>
                        <span>Status</span>
                      </div>
                      {sorted.map((task) => (
                        <button
                          className="priced-list-row"
                          key={task.id}
                          onClick={() => onEdit(task, board)}
                        >
                          <span>
                            {task.title}
                            <small>
                              {
                                board.columns.find(
                                  (column) => column.id === task.columnId,
                                )?.name
                              }
                            </small>
                          </span>
                          <span>{task.due || "No due date"}</span>
                          <span>{task.assignee || "Unassigned"}</span>
                          <span>{money(task.priceCents || 0)}</span>
                          <span>{task.status}</span>
                        </button>
                      ))}
                      {!sorted.length && (
                        <p className="collaboration-caption">
                          No matching tasks on this board.
                        </p>
                      )}
                    </section>
                  ) : (
                    <div className="custom-kanban">
                      {board.columns.map((column, index) => (
                        <section
                          className="column"
                          key={column.id}
                          onDragOver={(e) => {
                            if (canManage) e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (!canManage) return;
                            const task = boardTasks.find(
                              (item) =>
                                item.id ===
                                e.dataTransfer.getData("text/plain"),
                            );
                            if (task)
                              void onMove({ ...task, columnId: column.id });
                          }}
                        >
                          <header>
                            <span>
                              <i className={"dot dot-" + (index % 4)} />
                              {column.name}
                              <small>
                                {
                                  sorted.filter(
                                    (task) => task.columnId === column.id,
                                  ).length
                                }
                              </small>
                            </span>
                            {canManage && (
                              <div className="column-controls">
                                <button
                                  aria-label={"Rename " + column.name}
                                  onClick={() => renameColumn(column)}
                                >
                                  <Settings2 size={13} />
                                </button>
                                <button
                                  aria-label={"Delete " + column.name}
                                  onClick={() => removeColumn(column)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </header>
                          {boardTasks.some(
                            (task) =>
                              task.columnId === column.id &&
                              (task.priceCents || 0) > 0,
                          ) && (
                            <span className="column-total">
                              {money(
                                boardTasks
                                  .filter((task) => task.columnId === column.id)
                                  .reduce(
                                    (sum, task) => sum + (task.priceCents || 0),
                                    0,
                                  ),
                              )}
                            </span>
                          )}
                          <div className="column-tasks">
                            {sorted
                              .filter((task) => task.columnId === column.id)
                              .map((task) => (
                                <article
                                  className="task-card"
                                  key={task.id}
                                  role="button"
                                  tabIndex={0}
                                  draggable={canManage}
                                  onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      task.id,
                                    )
                                  }
                                  onClick={() => onEdit(task, board)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") onEdit(task, board);
                                  }}
                                >
                                  <span
                                    className={
                                      "priority " + task.priority.toLowerCase()
                                    }
                                  >
                                    {task.priority} priority
                                  </span>
                                  <h3>{task.title}</h3>
                                  {task.pricingMode === "hourly" && (
                                    <p className="task-rate-line">
                                      {hoursLabel(task.plannedMinutes || 0)} h ×{" "}
                                      {money(task.hourlyRateCents || 0)}/h
                                    </p>
                                  )}
                                  <span className="task-workflow-status">
                                    {task.status}
                                  </span>
                                  {task.description && (
                                    <p>{task.description}</p>
                                  )}
                                  <footer>
                                    <span>
                                      <CalendarDays size={13} />
                                      {task.due || "No due date"}
                                    </span>
                                    {(task.priceCents || 0) > 0 && (
                                      <span className="task-price">
                                        {money(task.priceCents || 0)}
                                      </span>
                                    )}
                                    {task.assignee && (
                                      <span
                                        className="avatar"
                                        title={task.assignee}
                                      >
                                        {task.assignee
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </span>
                                    )}
                                  </footer>
                                </article>
                              ))}
                            {!sorted.some(
                              (task) => task.columnId === column.id,
                            ) && (
                              <div className="empty-column">
                                <FolderKanban size={22} />
                                <p>No tasks yet</p>
                              </div>
                            )}
                          </div>
                          {canManage && (
                            <button
                              className="add-task"
                              onClick={() => onCreate(board, column)}
                            >
                              <Plus size={15} />
                              Add task
                            </button>
                          )}
                        </section>
                      ))}
                      {canManage && (
                        <button
                          className="add-column"
                          onClick={() => openForm("column")}
                        >
                          <Plus size={17} />
                          Add column
                        </button>
                      )}
                    </div>
                  )}
                  {canManage && tab === "List" && board.columns.length > 0 && (
                    <button
                      className="secondary add-column-list"
                      onClick={() => openForm("column")}
                    >
                      <Plus size={15} />
                      Add column
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {form && (
        <div className="modal-backdrop">
          <form
            className="board-form"
            role="dialog"
            aria-modal="true"
            aria-label={form === "board" ? "Create board" : "Create column"}
            onSubmit={create}
          >
            <header>
              <div>
                <span className="eyebrow">YOUR WORKSPACE</span>
                <h2>
                  {form === "board" ? "Create a board" : "Add a task column"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close board form"
                onClick={() => setForm(null)}
              >
                <X size={21} />
              </button>
            </header>
            <label>
              {form === "board" ? "Board name" : "Column name"}
              <input
                required
                autoFocus
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  form === "board"
                    ? "e.g. Beyond Lock production"
                    : "e.g. Development"
                }
              />
            </label>
            {form === "board" && (
              <label>
                Board description
                <textarea
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will this board organize?"
                />
              </label>
            )}
            <p>
              {form === "board"
                ? "Boards start empty. You choose the task columns. Task prices are recorded in USD."
                : "Tasks in this column are automatically ordered by their due date."}
            </p>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy || !name.trim()}>
              {busy
                ? "Creating..."
                : form === "board"
                  ? "Create board"
                  : "Create column"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
