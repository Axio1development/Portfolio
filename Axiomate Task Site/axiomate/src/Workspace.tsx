import TaskReferences, { type TaskReference } from "./TaskReferences";
import TaskClockAuthorization from "./TaskClockAuthorization";
import TaskNegotiation from "./TaskNegotiation";
import BoardHub from "./BoardHub";
import type { ReviewDecision } from "./SubmissionReview";
import TeamPanel from "./TeamPanel";
import InvitationPage from "./InvitationPage";
import TaskSubmissions from "./TaskSubmissions";
import WorkspaceSetup, { WorkspaceForm } from "./WorkspaceSetup";
import Preview from "./Preview";
import TaskEditor from "./TaskEditor";
import { useState, useEffect, useRef } from "react";
import { AuthPage, Brand, PlanPicker } from "./Onboarding";
import AccountSettings from "./AccountSettings";
import type {
  Account,
  Task,
  Activity,
  PlanId,
  ProjectWorkspace,
  TeamMember,
  Submission,
  PendingInvite,
  Invitation,
  BoardColumn,
  TaskOffer,
  TaskClockApproval,
} from "./types";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  LogOut,
  ChevronRight,
  Settings2,
  FolderPlus,
  UserRound,
  ChevronDown,
  Clock,
  ShieldCheck,
} from "lucide-react";
export default function Workspace() {
  const [preview, setPreview] = useState(
    () => new URLSearchParams(window.location.search).get("preview") === "1",
  );
  function showPreview(value: boolean) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("preview", "1");
    else url.searchParams.delete("preview");
    window.history.replaceState({}, "", url);
    setPreview(value);
  }
  const [tab, setTab] = useState("Board"),
    [tasks, setTasks] = useState<Task[]>([]),
    [editing, setEditing] = useState<Task | null>(null);
  const [user, setUser] = useState<Account | null>(null),
    [activity, setActivity] = useState<Activity[]>([]),
    [csrf, setCsrf] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [choosingPlan, setChoosingPlan] = useState(false);
  const [workspaces, setWorkspaces] = useState<ProjectWorkspace[]>([]),
    [activeId, setActiveId] = useState(""),
    [workspacesLoading, setWorkspacesLoading] = useState(true),
    [workspaceForm, setWorkspaceForm] = useState<"create" | "edit" | null>(
      null,
    );
  const [references, setReferences] = useState<TaskReference[]>([]);
  const [clockApprovals, setClockApprovals] = useState<TaskClockApproval[]>([]);
  const [offers, setOffers] = useState<TaskOffer[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [canAdminTime, setCanAdminTime] = useState(false),
    [editingColumns, setEditingColumns] = useState<BoardColumn[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [invitations, setInvitations] = useState<PendingInvite[]>([]),
    [uploadLimit, setUploadLimit] = useState(25 * 1048576);
  const [inviteToken, setInviteToken] = useState(
      () => new URLSearchParams(window.location.search).get("invite") || "",
    ),
    [invitation, setInvitation] = useState<Invitation | null>(null),
    [inviteLoading, setInviteLoading] = useState(false),
    [inviteError, setInviteError] = useState("");
  const canManage = Boolean(
    workspaces.find((item) => item.id === activeId)?.canManage,
  );
  function clearInvitation() {
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, "", url);
    setInviteToken("");
    setInvitation(null);
    setInviteError("");
  }
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    fetch("/api.php?action=inviteInfo&token=" + encodeURIComponent(inviteToken))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        setInvitation(data.invitation);
      })
      .catch((e) => setInviteError(e.message))
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);
  async function acceptInvitation() {
    setBusy(true);
    setInviteError("");
    try {
      const data = await api("acceptInvite", { token: inviteToken });
      if (user)
        localStorage.setItem("axiomate.workspace." + user.id, data.workspaceId);
      clearInvitation();
      await loadWorkspaces();
    } catch (e) {
      setInviteError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refreshTeam() {
    if (!activeId) return;
    const data = await api("team", { workspaceId: activeId });
    setMembers(data.members);
    setInvitations(data.invitations);
  }
  useEffect(() => {
    if (tab === "Team" && activeId)
      void refreshTeam().catch((e) => setError(e.message));
  }, [tab, activeId]);
  async function authorizeClock(action: string, note: string) {
    if (!editing) return;
    await api(action, {
      workspaceId: activeId,
      taskId: editing.id,
      revision: editing.revision,
      note,
    });
    const data = await refresh();
    if (data)
      setEditing(
        data.tasks.find((task: Task) => task.id === editing.id) || null,
      );
  }
  async function negotiate(action: string, body: object) {
    if (!editing) return;
    await api(action, { workspaceId: activeId, taskId: editing.id, ...body });
    const data = await refresh();
    if (data)
      setEditing(
        data.tasks.find((task: Task) => task.id === editing.id) || null,
      );
  }
  async function reviewWork(
    submissionId: string,
    decision: ReviewDecision,
    feedback: string,
  ) {
    await api("reviewSubmission", {
      workspaceId: activeId,
      submissionId,
      decision,
      feedback,
    });
    const data = await refresh();
    if (data && editing)
      setEditing(
        data.tasks.find((task: Task) => task.id === editing.id) || null,
      );
  }
  async function addReference(file: File | null, title: string, url: string) {
    if (!editing) return;
    if (file) {
      const form = new FormData();
      form.set("workspaceId", activeId);
      form.set("taskId", editing.id);
      form.set("title", title);
      form.set("file", file);
      const response = await fetch("/api.php?action=uploadReference", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: form,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw Error(
          "Upload failed. Try a smaller file or add a reference link.",
        );
      }
      if (!response.ok) throw Error(data.error || "Reference upload failed.");
    } else
      await api("addReference", {
        workspaceId: activeId,
        taskId: editing.id,
        title,
        url,
      });
    await refresh();
  }
  async function removeReference(id: string) {
    await api("deleteReference", { workspaceId: activeId, id });
    await refresh();
  }
  async function uploadWork(file: File, note: string) {
    if (!editing) return;
    const form = new FormData();
    form.set("workspaceId", activeId);
    form.set("taskId", editing.id);
    form.set("note", note);
    form.set("file", file);
    const response = await fetch("/api.php?action=uploadSubmission", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: form,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error(
        "The server could not accept the upload. Try a smaller file.",
      );
    }
    if (!response.ok) throw Error(data.error || "Upload failed");
    const refreshed = await refresh();
    if (refreshed)
      setEditing(
        refreshed.tasks.find((task: Task) => task.id === editing.id) || null,
      );
  }
  const activeIdRef = useRef("");
  const activeWorkspace = workspaces.find((item) => item.id === activeId);
  function switchWorkspace(id: string) {
    activeIdRef.current = id;
    setActiveId(id);
    setTasks([]);
    setMembers([]);
    setSubmissions([]);
    setOffers([]);
    setClockApprovals([]);
    setReferences([]);
    setCanReview(false);
    setCanAdminTime(false);
    setInvitations([]);
    setEditing(null);
    setError("");
    if (user) localStorage.setItem("axiomate.workspace." + user.id, id);
  }
  async function loadWorkspaces() {
    setWorkspacesLoading(true);
    try {
      const data = await api("workspaces");
      setWorkspaces(data.workspaces);
      const saved = user
        ? localStorage.getItem("axiomate.workspace." + user.id)
        : null;
      switchWorkspace(
        data.workspaces.find((w: ProjectWorkspace) => w.id === saved)?.id ||
          data.workspaces[0]?.id ||
          "",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorkspacesLoading(false);
    }
  }
  async function saveWorkspace(name: string, description: string) {
    setBusy(true);
    setError("");
    try {
      if (workspaceForm === "edit" && activeWorkspace) {
        await api("renameWorkspace", {
          workspaceId: activeId,
          name,
          description,
        });
        setWorkspaces((items) =>
          items.map((item) =>
            item.id === activeId ? { ...item, name, description } : item,
          ),
        );
      } else {
        const data = await api("createWorkspace", { name, description });
        setWorkspaces((items) => [...items, data.workspace]);
        switchWorkspace(data.workspace.id);
      }
      setWorkspaceForm(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function api(action: string, body: object = {}) {
    const r = await fetch("/api.php?action=" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok)
      throw Object.assign(new Error(data.error || "Request failed"), {
        status: r.status,
      });
    return data;
  }
  async function state() {
    const r = await fetch("/api.php?action=state");
    if (!r.ok) throw Error("Cannot connect to the workspace server.");
    const data = await r.json();
    setCsrf(data.csrf);
    setUser(data.user);
    return data;
  }
  useEffect(() => {
    if (preview) return;
    state()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [preview]);
  async function refresh() {
    try {
      const id = activeId;
      if (!id) return;
      const data = await api("workspace", { workspaceId: id });
      if (activeIdRef.current !== id) return;
      setTasks(data.tasks);
      setOffers(data.negotiations);
      setClockApprovals(data.clockApprovals);
      setReferences(data.references);
      setActivity(data.activity);
      setMembers(data.members);
      setSubmissions(data.submissions);
      setCanReview(data.canReview);
      setCanAdminTime(data.canAdminTime);
      setUploadLimit(data.uploadLimitBytes);
      return data;
    } catch (e) {
      setError((e as Error).message);
      if ([403, 404].includes((e as Error & { status?: number }).status || 0)) {
        switchWorkspace("");
        await loadWorkspaces();
      }
      await state();
    }
  }
  useEffect(() => {
    if (!preview && user?.id && csrf) void loadWorkspaces();
  }, [user?.id, Boolean(user?.plan), csrf, preview]);
  useEffect(() => {
    if (!preview && user?.id && csrf && activeId) {
      void refresh();
      const timer = setInterval(refresh, 20000);
      return () => clearInterval(timer);
    }
  }, [activeId, user?.id, user?.plan, csrf, preview]);
  async function login(
    mode: string,
    values: { name: string; email: string; password: string },
  ) {
    setBusy(true);
    setError("");
    try {
      await api(mode, values);
      await state();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("logout");
      activeIdRef.current = "";
      setActiveId("");
      setWorkspaces([]);
      setWorkspacesLoading(true);
      setTasks([]);
      setUser(null);
      setActivity([]);
      setTab("Board");
      setChoosingPlan(false);
      await state();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function choosePlan(plan: PlanId) {
    setBusy(true);
    setError("");
    try {
      await api("choosePlan", { plan });
      await state();
      setChoosingPlan(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function persist(t: Task) {
    try {
      await api("saveTask", { task: t, workspaceId: activeId });
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  async function remove(t: Task) {
    if (!confirm("Delete this task permanently?")) return;
    try {
      await api("deleteTask", {
        id: t.id,
        revision: t.revision,
        workspaceId: activeId,
      });
      setTasks((old) => old.filter((x) => x.id !== t.id));
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const empty = (): Task => ({
    id: crypto.randomUUID(),
    title: "",
    description: "",
    status: "Backlog",
    priority: "Medium",
    due: "",
    assignee: "",
    assigneeId: "",
    checklist: "",
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing?.title.trim()) return;
    setBusy(true);
    if (await persist(editing)) setEditing(null);
    setBusy(false);
  }
  if (preview) return <Preview onExit={() => showPreview(false)} />;
  if (loading)
    return (
      <div className="loading">
        <Brand />
        <p>Opening your workspace…</p>
      </div>
    );
  if (inviteLoading)
    return (
      <div className="loading">
        <Brand />
        <p>Opening invitation...</p>
      </div>
    );
  if (inviteToken && (user || inviteError))
    return (
      <InvitationPage
        user={user}
        invitation={invitation}
        busy={busy}
        error={inviteError}
        onAccept={acceptInvitation}
        onExit={clearInvitation}
        onLogout={logout}
      />
    );
  if (!user)
    return (
      <AuthPage
        onSubmit={login}
        onPreview={() => showPreview(true)}
        busy={busy}
        error={error}
        invitation={invitation}
      />
    );
  if ((!user.plan && !workspacesLoading && !workspaces.length) || choosingPlan)
    return (
      <PlanPicker
        user={user}
        busy={busy}
        error={error}
        onSelect={choosePlan}
        onBack={() => {
          if (user.plan || workspaces.length) setChoosingPlan(false);
          else void logout();
        }}
      />
    );
  if (workspacesLoading)
    return (
      <div className="loading">
        <Brand />
        <p>Loading your workspaces...</p>
      </div>
    );
  if (!workspaces.length)
    return (
      <WorkspaceSetup
        email={user.email}
        busy={busy}
        error={error}
        onCreate={saveWorkspace}
        onLogout={logout}
      />
    );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-select account-workspace-select workspace-picker">
          <span className="workspace-letter" aria-hidden="true">
            {activeWorkspace?.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="workspace-picker-text" aria-hidden="true">
            <small>WORKSPACE</small>
            <strong>{activeWorkspace?.name}</strong>
          </div>
          <ChevronDown
            className="workspace-chevron"
            size={15}
            aria-hidden="true"
          />
          <select
            aria-label="Switch workspace"
            value={activeId}
            onChange={(e) => switchWorkspace(e.target.value)}
          >
            {workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="nav-item create-workspace-nav"
          onClick={() => {
            setError("");
            if (!user.plan && user.role !== "owner") setChoosingPlan(true);
            setWorkspaceForm("create");
          }}
        >
          <FolderPlus size={17} />
          New workspace
        </button>
        <nav className="sidebar-navigation" aria-label="Workspace navigation">
          <div className="sidebar-nav-group">
            <span className="nav-label">PROJECT</span>
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
            <button
              className={"nav-item " + (tab === "Team" ? "active" : "")}
              onClick={() => setTab("Team")}
            >
              <Users size={18} />
              Team
            </button>
          </div>
          <div className="sidebar-nav-group">
            <span className="nav-label">TIME & OPERATIONS</span>
            <button
              className={"nav-item " + (tab === "Clock" ? "active" : "")}
              onClick={() => setTab("Clock")}
            >
              <Clock size={18} />
              Clock in
            </button>
            {canAdminTime && (
              <button
                className={"nav-item " + (tab === "Management" ? "active" : "")}
                onClick={() => setTab("Management")}
              >
                <ShieldCheck size={18} />
                Management
              </button>
            )}
          </div>
        </nav>
        <div className="sidebar-bottom">
          <button
            className={"nav-item " + (tab === "Account" ? "active" : "")}
            onClick={() => setTab("Account")}
          >
            <UserRound size={18} />
            Account
          </button>
          <button className="nav-item" onClick={logout}>
            <LogOut size={17} />
            Sign out
          </button>
          <div className="profile">
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "owner"
                  ? "Site owner"
                  : user.plan
                    ? user.plan + " plan"
                    : "Collaborator"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <span className="breadcrumb">
            {activeWorkspace?.name}
            <ChevronRight size={14} />
            {tab}
          </span>
          <span className="pill">Private workspace</span>
        </header>
        <div className="page-heading">
          <span className="eyebrow">WORKSPACE OVERVIEW</span>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          <div className="heading-row">
            <div>
              <h1>
                {tab === "Account"
                  ? "Account settings"
                  : tab === "Team"
                    ? "Workspace team"
                    : tab === "Clock"
                      ? "Your time clock"
                      : tab === "Management"
                        ? "Board management"
                        : activeWorkspace?.name}
              </h1>
              <p>
                {tab === "Account"
                  ? "Your account, plan, and preferences."
                  : tab === "Team"
                    ? "Invite collaborators, manage roles, and keep your project moving."
                    : activeWorkspace?.description ||
                      "Organize tasks, track priorities, and keep work moving."}
              </p>
            </div>
            {canManage && tab !== "Account" && tab !== "Team" && (
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  setWorkspaceForm("edit");
                }}
              >
                <Settings2 size={15} />
                Workspace settings
              </button>
            )}
          </div>
        </div>
        {(tab === "Board" || tab === "List") && (
          <div className="metrics">
            {[
              ["Total tasks", tasks.length, "Across your workspace"],
              [
                "In progress",
                tasks.filter((t) => t.status === "In progress").length,
                "Moving things forward",
              ],
              [
                "Completed",
                tasks.filter((t) => t.status === "Done").length,
                "One step closer",
              ],
              [
                "Overdue",
                tasks.filter(
                  (t) =>
                    t.due &&
                    t.due < new Date().toISOString().slice(0, 10) &&
                    t.status !== "Done",
                ).length,
                "Ready for your attention",
              ],
            ].map(([label, n, caption], i) => (
              <div className="metric" key={label}>
                <span>
                  {label}
                  <i className={"dot dot-" + i} />
                </span>
                <strong>{n}</strong>
                <small>{caption}</small>
              </div>
            ))}
          </div>
        )}
        {tab === "Account" ? (
          <AccountSettings
            user={user}
            activity={activity}
            onPlans={() => {
              setError("");
              setChoosingPlan(true);
            }}
            onPassword={async (currentPassword, newPassword) => {
              await api("password", { currentPassword, newPassword });
            }}
          />
        ) : tab === "Team" ? (
          <TeamPanel
            key={activeId}
            workspaceId={activeId}
            members={members}
            invitations={invitations}
            canManage={canManage}
            api={api}
            onRefresh={refreshTeam}
          />
        ) : (
          <BoardHub
            key={activeId}
            workspaceId={activeId}
            tasks={tasks}
            tab={tab}
            setTab={setTab}
            canManage={canManage}
            canAdminTime={canAdminTime}
            api={api}
            onCreate={(board, column) => {
              setEditingColumns(board.columns);
              setEditing({
                ...empty(),
                boardId: board.id,
                columnId: column.id,
                priceCents: 0,
              });
            }}
            onEdit={(task, board) => {
              setEditingColumns(board.columns);
              setEditing(task);
            }}
            onMove={persist}
            onRefresh={refresh}
          />
        )}
        <footer className="content-footer">
          <span>
            <i />
            Your work, organized.
          </span>
          <span>AXIOMATE / WORKSPACE</span>
        </footer>
      </main>
      {workspaceForm && (
        <div className="modal-backdrop">
          <section
            className="workspace-form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace settings"
          >
            <WorkspaceForm
              key={workspaceForm + activeId}
              initial={workspaceForm === "edit" ? activeWorkspace : undefined}
              busy={busy}
              error={error}
              onSubmit={saveWorkspace}
              onClose={() => setWorkspaceForm(null)}
            />
          </section>
        </div>
      )}
      {editing && (
        <TaskEditor
          editing={editing}
          setEditing={setEditing}
          tasks={tasks}
          error={error}
          busy={busy}
          save={save}
          remove={remove}
          members={members}
          boardColumns={editingColumns}
          termsLocked={offers.some(
            (offer) =>
              offer.taskId === editing.id &&
              offer.assigneeId === editing.assigneeId &&
              offer.status === "accepted",
          )}
          requiresReview={
            submissions.find((item) => item.taskId === editing.id)
              ?.reviewStatus === "pending"
          }
          canManage={canManage}
          canChangeStatus={canAdminTime}
          canWork={
            canManage ||
            (editing.assigneeId === user.id && editing.status !== "Done")
          }
        >
          {!tasks.some((task) => task.id === editing.id) && (
            <section className="task-references">
              <h3>Task references</h3>
              <p>
                Save this task to attach reference images, videos, or links.
              </p>
            </section>
          )}
          {tasks.some((task) => task.id === editing.id) && (
            <TaskReferences
              references={references.filter(
                (item) => item.taskId === editing.id,
              )}
              canEdit={
                canManage ||
                canReview ||
                canAdminTime ||
                members.some(
                  (member) =>
                    member.id === user.id && member.role === "studio_owner",
                )
              }
              uploadLimit={uploadLimit}
              onAdd={addReference}
              onRemove={removeReference}
            />
          )}
          {tasks.some((task) => task.id === editing.id) && (
            <TaskClockAuthorization
              task={editing}
              approval={clockApprovals.find(
                (item) => item.taskId === editing.id,
              )}
              canAuthorize={canAdminTime}
              hasUnsavedChanges={
                JSON.stringify(editing) !==
                JSON.stringify(tasks.find((task) => task.id === editing.id))
              }
              onChange={authorizeClock}
            />
          )}
          {tasks.some((task) => task.id === editing.id) &&
            editing.pricingMode === "hourly" &&
            (canManage || editing.assigneeId === user.id) && (
              <TaskNegotiation
                key={editing.id}
                task={editing}
                offers={offers.filter((offer) => offer.taskId === editing.id)}
                userId={user.id}
                canPropose={
                  editing.status !== "Done" &&
                  Boolean(editing.assigneeId) &&
                  editing.assigneeId !==
                    members.find((member) => member.role === "workspace_owner")
                      ?.id
                }
                onPropose={async (plannedMinutes, hourlyRateCents, message) =>
                  negotiate("proposeTerms", {
                    plannedMinutes,
                    hourlyRateCents,
                    message,
                  })
                }
                onRespond={async (offerId, decision, note) =>
                  negotiate("respondToTerms", { offerId, decision, note })
                }
              />
            )}
          {tasks.some((task) => task.id === editing.id) && (
            <TaskSubmissions
              submissions={submissions.filter(
                (item) => item.taskId === editing.id,
              )}
              canSubmit={
                editing.assigneeId === user.id && editing.status !== "Done"
              }
              uploadLimit={uploadLimit}
              onUpload={uploadWork}
              canReview={canReview}
              onReview={reviewWork}
            />
          )}
        </TaskEditor>
      )}
    </div>
  );
}
