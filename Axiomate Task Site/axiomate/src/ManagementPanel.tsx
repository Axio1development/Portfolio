import { money } from "./pricing";
import { useEffect, useState } from "react";
import { Clock, LockKeyhole, Settings2, ShieldCheck, X } from "lucide-react";
import { duration, when } from "./ClockPanel";
import type { WorkspaceApi } from "./ClockPanel";
import type { ProjectBoard, TimeSession, TimeEvent, TeamMember } from "./types";
const localInput = (seconds: number) => {
  const date = new Date(seconds * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
};
export default function ManagementPanel({
  board,
  workspaceId,
  api,
}: {
  board: ProjectBoard;
  workspaceId: string;
  api: WorkspaceApi;
}) {
  const [sessions, setSessions] = useState<TimeSession[]>([]),
    [events, setEvents] = useState<TimeEvent[]>([]),
    [members, setMembers] = useState<(TeamMember & { blocked: boolean })[]>([]),
    [owner, setOwner] = useState(false),
    [now, setNow] = useState(Date.now() / 1000),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<TimeSession | null>(null),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [reason, setReason] = useState("");
  async function refresh() {
    try {
      const data = await api("management", { workspaceId, boardId: board.id });
      setSessions(data.sessions);
      setEvents(data.events);
      setMembers(data.members);
      setOwner(data.canManageWorkspace);
      setNow(data.serverNow);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setSessions([]);
      setMembers([]);
      setEvents([]);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [board.id]);
  async function action(name: string, body: object) {
    setBusy(true);
    setError("");
    try {
      await api(name, { workspaceId, boardId: board.id, ...body });
      await refresh();
      setEditing(null);
      setReason("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function adjust(session: TimeSession) {
    setEditing(session);
    setStart(localInput(session.started_at));
    setEnd(session.ended_at ? localInput(session.ended_at) : "");
    setReason("");
  }
  const active = sessions.filter((session) => session.ended_at === null);
  return (
    <div className="management-layout">
      <div className="management-notice">
        <ShieldCheck size={18} />
        <div>
          <strong>Board management</strong>
          <p>
            Restricted to the workspace owner, Studio Directors, and Studio
            Managers. Every time correction keeps its original record and a
            reason.
          </p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <section className="panel">
        <div className="section-title">
          <h2>
            <Clock size={17} />
            Active shifts
          </h2>
          <span className="pill">{active.length} clocked in</span>
        </div>
        {active.length ? (
          <div className="management-shifts">
            {active.map((session) => (
              <article key={session.id}>
                <div>
                  <strong>{session.name}</strong>
                  <small>{session.task_title || "Legacy board shift"}</small>
                  <small>
                    In: {when(session.started_at)}
                    {session.hourly_rate_cents !== null
                      ? " / " + money(session.hourly_rate_cents) + "/hour"
                      : ""}
                  </small>
                </div>
                <span
                  className={
                    now - session.started_at >= 43200 ? "long-duration" : ""
                  }
                >
                  {duration(now - session.started_at)}
                  {session.trackedCents !== null && (
                    <small>Tracked {money(session.trackedCents)}</small>
                  )}
                  {now - session.started_at >= 43200 && (
                    <small>Long-running shift</small>
                  )}
                </span>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    const note = prompt("Reason for forcing this clock-out:");
                    if (note?.trim())
                      void action("forceClockOut", {
                        sessionId: session.id,
                        revision: session.revision,
                        reason: note,
                      });
                  }}
                >
                  Force clock out
                </button>
                <button
                  className="edit-time-button"
                  onClick={() => adjust(session)}
                >
                  <Settings2 size={15} />
                  Adjust
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="collaboration-caption">
            Nobody is clocked in to this board.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>Time records</h2>
          <span className="pill">Local time</span>
        </div>
        <div className="management-records">
          {sessions.map((session) => (
            <article key={session.id}>
              <div>
                <strong>{session.name}</strong>
                <small>{session.task_title || "Legacy board shift"}</small>
                <small>
                  {when(session.started_at)} —{" "}
                  {session.ended_at ? when(session.ended_at) : "Active"}
                </small>
              </div>
              <span>
                {duration((session.ended_at ?? now) - session.started_at)}
              </span>
              <button
                className="edit-time-button"
                onClick={() => adjust(session)}
              >
                Adjust time
              </button>
            </article>
          ))}
          {!sessions.length && (
            <p className="collaboration-caption">
              Time records appear once someone clocks in.
            </p>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>
            <LockKeyhole size={17} />
            Board access
          </h2>
        </div>
        <p className="collaboration-caption">
          Removing access applies to this board and closes any active shift
          here. Other workspace boards stay available.
        </p>
        <div className="management-members">
          {members.map((member) => (
            <article key={member.id}>
              <span className="avatar">
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{member.name}</strong>
                <small>
                  {member.role.replaceAll("_", " ")} /{" "}
                  {member.blocked ? "Access removed" : "Active access"}
                </small>
              </div>
              {member.role !== "workspace_owner" &&
                (owner ||
                  ![
                    "studio_director",
                    "studio_manager",
                    "studio_owner",
                  ].includes(member.role)) && (
                  <button
                    className={member.blocked ? "secondary" : "remove-member"}
                    disabled={busy}
                    onClick={() => {
                      const note = prompt(
                        `Reason to ${member.blocked ? "restore" : "remove"} this person's board access:`,
                      );
                      if (note?.trim())
                        void action("setBoardAccess", {
                          userId: member.id,
                          blocked: !member.blocked,
                          reason: note,
                        });
                    }}
                  >
                    {member.blocked ? "Restore access" : "Remove access"}
                  </button>
                )}
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>Time audit history</h2>
        </div>
        <div className="time-audit">
          {events.map((event) => (
            <article key={event.id}>
              <strong>
                {event.member} / {event.action.replaceAll("_", " ")}
              </strong>
              <p>{event.reason}</p>
              <small>
                {event.editor} / {when(event.created)}
              </small>
              {event.action === "adjusted" &&
                event.beforeJson &&
                event.afterJson && (
                  <details>
                    <summary>View original and corrected times</summary>
                    <p>
                      Original: {when(JSON.parse(event.beforeJson).started_at)}{" "}
                      —{" "}
                      {JSON.parse(event.beforeJson).ended_at
                        ? when(JSON.parse(event.beforeJson).ended_at)
                        : "Active"}
                    </p>
                    <p>
                      Corrected: {when(JSON.parse(event.afterJson).started_at)}{" "}
                      —{" "}
                      {JSON.parse(event.afterJson).ended_at
                        ? when(JSON.parse(event.afterJson).ended_at)
                        : "Active"}
                    </p>
                  </details>
                )}
            </article>
          ))}
          {!events.length && (
            <p className="collaboration-caption">
              No time changes recorded yet.
            </p>
          )}
        </div>
      </section>
      {editing && (
        <div className="modal-backdrop">
          <form
            className="time-adjust-form"
            role="dialog"
            aria-modal="true"
            aria-label="Adjust time record"
            onSubmit={(e) => {
              e.preventDefault();
              void action("adjustTime", {
                sessionId: editing.id,
                revision: editing.revision,
                startedAt: Math.floor(new Date(start).getTime() / 1000),
                endedAt: end
                  ? Math.floor(new Date(end).getTime() / 1000)
                  : null,
                reason,
              });
            }}
          >
            <header>
              <div>
                <span className="eyebrow">TIME CORRECTION</span>
                <h2>{editing.name}</h2>
              </div>
              <button
                type="button"
                aria-label="Close time correction"
                onClick={() => setEditing(null)}
              >
                <X size={21} />
              </button>
            </header>
            <label>
              Clock-in time
              <input
                type="datetime-local"
                step="1"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Clock-out time
              <input
                type="datetime-local"
                step="1"
                required={editing.ended_at !== null}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label>
              Reason for correction
              <textarea
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the recorded time needs to change."
              />
            </label>
            <p>
              Times use your device's local timezone. The previous record stays
              in the audit history.
            </p>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Saving..." : "Save time correction"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
