import { useState } from "react";
import { ArrowRight, FolderKanban, LockKeyhole, X } from "lucide-react";
import Brand from "./Brand";
import type { ProjectWorkspace } from "./types";
export function WorkspaceForm({
  initial,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  initial?: ProjectWorkspace;
  busy: boolean;
  error: string;
  onSubmit: (name: string, description: string) => Promise<void>;
  onClose?: () => void;
}) {
  const [name, setName] = useState(initial?.name || ""),
    [description, setDescription] = useState(initial?.description || "");
  return (
    <form
      className="workspace-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(name, description);
      }}
    >
      <header>
        <div>
          <span className="eyebrow">YOUR SPACE TO WORK</span>
          <h2>{initial ? "Workspace settings" : "Create a workspace"}</h2>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close workspace form"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
      </header>
      <p>
        {initial
          ? "Update the name and description of this workspace."
          : "Give your project a home. You can create more workspaces whenever you need them."}
      </p>
      <label>
        Workspace name
        <input
          required
          autoFocus
          maxLength={80}
          placeholder="e.g. Product launch, Client projects"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Description <span>(optional)</span>
        <textarea
          maxLength={500}
          placeholder="What will you work on here?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="workspace-privacy">
        <LockKeyhole size={15} />
        <p>
          Private to this workspace. Only you and invited members can access the
          tasks in this workspace.
        </p>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <button className="primary" type="submit" disabled={busy || !name.trim()}>
        {busy ? "Saving..." : initial ? "Save workspace" : "Create workspace"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
export default function WorkspaceSetup({
  email,
  busy,
  error,
  onCreate,
  onLogout,
}: {
  email: string;
  busy: boolean;
  error: string;
  onCreate: (name: string, description: string) => Promise<void>;
  onLogout: () => void;
}) {
  return (
    <main className="workspace-onboarding">
      <header>
        <Brand />
        <button className="text-button" onClick={onLogout}>
          Sign out
        </button>
      </header>
      <div className="workspace-intro">
        <span className="workspace-intro-icon">
          <FolderKanban size={28} />
        </span>
        <span className="eyebrow">LET'S SET THINGS UP</span>
        <h1>Your work. Your workspace.</h1>
        <p>
          Start with a project, a goal, or a space for your day-to-day work.
        </p>
      </div>
      <section className="workspace-setup-panel">
        <WorkspaceForm busy={busy} error={error} onSubmit={onCreate} />
      </section>
      <footer>Signed in as {email}</footer>
    </main>
  );
}
