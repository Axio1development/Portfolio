import { money, hoursLabel } from "./pricing";
import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import type {
  ProjectBoard,
  TimeSession,
  TimeEvent,
  EligibleClockTask,
} from "./types";
export const duration = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((value % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
};
export const when = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString();
export type WorkspaceApi = (action: string, body?: object) => Promise<any>;
export default function ClockPanel({
  board,
  workspaceId,
  api,
}: {
  board: ProjectBoard;
  workspaceId: string;
  api: WorkspaceApi;
}) {
  const [eligible, setEligible] = useState<EligibleClockTask[]>([]),
    [taskId, setTaskId] = useState("");
  const [active, setActive] = useState<TimeSession | null>(null),
    [sessions, setSessions] = useState<TimeSession[]>([]),
    [events, setEvents] = useState<TimeEvent[]>([]),
    [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    try {
      const data = await api("clockStatus", { workspaceId, boardId: board.id });
      setActive(data.active);
      setEligible(data.eligibleTasks);
      setTaskId((current) =>
        data.eligibleTasks.some(
          (task: EligibleClockTask) => task.id === current,
        )
          ? current
          : data.eligibleTasks[0]?.id || "",
      );
      setSessions(data.sessions);
      setEvents(data.events);
      setOffset(data.serverNow * 1000 - Date.now());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [board.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function clock(action: string) {
    setBusy(true);
    setError("");
    try {
      await api(action, {
        workspaceId: active?.workspace_id || workspaceId,
        boardId: active?.board_id || board.id,
        taskId,
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const elapsed = active
    ? Math.max(0, Math.floor((now + offset) / 1000) - active.started_at)
    : 0;
  const tracked =
    active?.hourly_rate_cents == null
      ? null
      : Math.floor((elapsed * active.hourly_rate_cents + 1800) / 3600);
  const here = active?.board_id === board.id;
  return (
    <div className="clock-layout">
      <section className="panel clock-panel">
        <div className="section-title">
          <h2>
            <Clock size={17} />
            Your time clock
          </h2>
          <span className={"pill " + (active ? "clocked-in" : "")}>
            {active ? "Clocked in" : "Off the clock"}
          </span>
        </div>
        <div className={"digital-clock " + (active ? "running" : "")}>
          <span>LOCAL TIME</span>
          <strong>
            {new Date(now).toLocaleTimeString("en-US", { hour12: false })}
          </strong>
          <small>
            {new Date(now).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </small>
          <div className="clock-pulse" />
        </div>
        <div className="shift-duration">
          <span>CURRENT SHIFT</span>
          <strong>{duration(elapsed)}</strong>
          <small>
            {active
              ? `${active.task_title || "Legacy shift"} / ${active.boardName}`
              : "Ready when you are."}
          </small>
        </div>
        {active && (
          <div className="active-task-rate">
            <span>APPROVED SESSION RATE</span>
            <strong>
              {active.hourly_rate_cents === null
                ? "No recorded rate"
                : money(active.hourly_rate_cents) + "/hour"}
            </strong>
            {tracked !== null && (
              <div>
                <span>Tracked amount</span>
                <strong>{money(tracked)}</strong>
              </div>
            )}
          </div>
        )}
        {!active && (
          <div className="eligible-task-area">
            <h3>Choose an approved task</h3>
            {eligible.length ? (
              <div className="eligible-task-grid">
                {eligible.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className={taskId === task.id ? "selected" : ""}
                    aria-pressed={taskId === task.id}
                    onClick={() => setTaskId(task.id)}
                  >
                    <strong>{task.title}</strong>
                    <span>
                      {money(task.hourlyRateCents)}/hour /{" "}
                      {hoursLabel(task.plannedMinutes)} planned hours
                    </span>
                    <small>Approved by {task.approvedBy}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="clock-not-approved">
                You need an assigned hourly task approved by the workspace
                owner, Studio Director, or Studio Manager before clocking in.
              </p>
            )}
          </div>
        )}
        {elapsed >= 12 * 3600 && (
          <p className="long-shift-note">
            This shift has been running for over 12 hours. Check that your time
            is correct.
          </p>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <button
          className={active ? "secondary clock-action" : "primary clock-action"}
          disabled={busy || (!active && !taskId)}
          onClick={() => clock(active ? "clockOut" : "clockIn")}
        >
          {active ? <LogOut size={17} /> : <LogIn size={17} />}{" "}
          {busy ? "Saving..." : active ? "Clock out" : "Clock in"}
        </button>
        {active && !here && (
          <p className="collaboration-caption">
            Your active shift is on another board. Clock out before starting
            here.
          </p>
        )}
        <p className="clock-note">
          Time continues when you close this page. Your clock-in and clock-out
          are saved on the server. Only one task can be clocked in at a time.
          Tracked amounts use the rate saved when the session starts.
        </p>
      </section>
      <section className="panel time-history">
        <div className="section-title">
          <h2>Your time on this board</h2>
          <span className="pill">
            {sessions.length} {sessions.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {sessions.length ? (
          <div className="time-entries">
            {sessions.map((session) => (
              <article key={session.id}>
                <div>
                  <strong>{session.task_title || "Legacy board shift"}</strong>
                  <span>{when(session.started_at)}</span>
                  <span>
                    {session.ended_at
                      ? `Out: ${when(session.ended_at)}`
                      : "Currently clocked in"}
                  </span>
                </div>
                <div className="recorded-task-amount">
                  <strong>
                    {duration(
                      (session.ended_at ?? Math.floor((now + offset) / 1000)) -
                        session.started_at,
                    )}
                  </strong>
                  {session.hourly_rate_cents !== null && (
                    <small>
                      {money(session.hourly_rate_cents)}/h /{" "}
                      {money(session.trackedCents || 0)}
                    </small>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="collaboration-caption">
            Clock in to start your first shift on this board.
          </p>
        )}
        <div className="time-audit">
          <h3>Time changes</h3>
          {events
            .filter(
              (event) => !["clock_in", "clock_out"].includes(event.action),
            )
            .map((event, i) => (
              <article key={event.id || i}>
                <strong>{event.action.replaceAll("_", " ")}</strong>
                <p>{event.reason}</p>
                <small>
                  {event.editor} / {when(event.created)}
                </small>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}
