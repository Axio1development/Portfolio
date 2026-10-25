import { ArrowRight, UserPlus } from "lucide-react";
import Brand from "./Brand";
import { roleName } from "./TeamPanel";
import type { Account, Invitation } from "./types";
export default function InvitationPage({
  user,
  invitation,
  busy,
  error,
  onAccept,
  onExit,
  onLogout,
}: {
  user: Account | null;
  invitation: Invitation | null;
  busy: boolean;
  error: string;
  onAccept: () => void;
  onExit: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="workspace-onboarding">
      <header>
        <Brand />
        <button className="text-button" onClick={onExit}>
          Back to workspace
        </button>
      </header>
      <div className="workspace-intro">
        <span className="workspace-intro-icon">
          <UserPlus size={28} />
        </span>
        <span className="eyebrow">WORKSPACE INVITATION</span>
        <h1>
          {invitation
            ? `Join ${invitation.workspaceName}`
            : "Invitation unavailable"}
        </h1>
        <p>
          {invitation
            ? `${invitation.invitedBy} invited you to collaborate as a ${roleName(invitation.role).toLowerCase()}.`
            : "This invitation may have expired or been revoked."}
        </p>
      </div>
      <section className="workspace-setup-panel invite-accept">
        <h2>Your place on the team.</h2>
        {invitation && (
          <>
            <p>
              This invitation is for <strong>{invitation.email}</strong>. Once
              you join, you can view the workspace and submit files for tasks
              assigned to you.
            </p>
            <span className="role-badge">{roleName(invitation.role)}</span>
          </>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {invitation && user && (
          <>
            <p>Signed in as {user.email}</p>
            {user.email.toLowerCase() === invitation.email ? (
              <button className="primary" disabled={busy} onClick={onAccept}>
                {busy ? "Joining..." : "Accept invitation"}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button className="secondary" onClick={onLogout}>
                Sign in with the invited email
              </button>
            )}
          </>
        )}
        <button className="text-button" onClick={onExit}>
          Go back
        </button>
      </section>
    </main>
  );
}
