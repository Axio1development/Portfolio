import { useState } from "react";
import { Check, Copy, Link, Mail, UserPlus, Users } from "lucide-react";
import type { TeamMember, PendingInvite } from "./types";
export const roleName = (role: string) =>
  ({
    developer: "Developer",
    tester: "Tester",
    voice_actor: "Voice actor",
    workspace_owner: "Studio Owner",
    studio_owner: "Studio Owner",
    studio_director: "Studio Director",
    studio_manager: "Studio Manager",
  })[role] || role;
type Api = (action: string, body?: object) => Promise<any>;
export default function TeamPanel({
  workspaceId,
  members,
  invitations,
  canManage,
  api,
  onRefresh,
}: {
  workspaceId: string;
  members: TeamMember[];
  invitations: PendingInvite[];
  canManage: boolean;
  api: Api;
  onRefresh: () => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [role, setRole] = useState("developer"),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setLink("");
    try {
      const data = await api("createInvite", { workspaceId, email, role });
      const url = new URL(window.location.origin);
      url.searchParams.set("invite", data.token);
      setLink(url.toString());
      setEmail("");
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(action: string, id: string) {
    setError("");
    try {
      await api(action, { workspaceId, id });
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function changeRank(id: string, role: string) {
    setError("");
    try {
      await api("setMemberRole", { workspaceId, id, role });
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="team-layout">
      {canManage && (
        <section className="panel invite-panel">
          <div className="section-title">
            <h2>
              <UserPlus size={18} />
              Invite a collaborator
            </h2>
            <span className="pill">Studio Owner</span>
          </div>
          <p className="collaboration-caption">
            Invite collaborators or studio leadership. Studio Directors and
            Studio Owners can approve, deny, or request changes to submitted
            work.
          </p>
          <form className="invite-form" onSubmit={invite}>
            <label>
              Email address
              <input
                type="email"
                required
                maxLength={254}
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Role
              <select
                aria-label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="voice_actor">Voice actor</option>
                <option value="studio_director">Studio Director</option>
                <option value="studio_owner">Studio Owner</option>
                <option value="studio_manager">Studio Manager</option>
              </select>
            </label>
            <button className="primary" disabled={busy}>
              <Link size={15} />
              {busy ? "Creating..." : "Create invitation link"}
            </button>
          </form>
          <p className="invite-help">
            <Mail size={13} />
            Copy and share the link yourself. Invitations are valid for 7 days
            and require the invited email address.
          </p>
          {link && (
            <div className="invite-link">
              <strong>Invitation ready to share</strong>
              <div>
                <input
                  aria-label="Invitation link"
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    } catch {
                      setError("Select and copy the invitation link.");
                    }
                  }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <section className="panel">
        <div className="section-title">
          <h2>
            <Users size={18} />
            Workspace team
          </h2>
          <span className="pill">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
        <div className="team-members">
          {members.map((member) => (
            <div className="team-member" key={member.id}>
              <span className="avatar">
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              {canManage && member.role !== "workspace_owner" ? (
                <select
                  className="member-rank-select"
                  aria-label={"Rank for " + member.name}
                  value={member.role}
                  onChange={(e) => changeRank(member.id, e.target.value)}
                >
                  <option value="developer">Developer</option>
                  <option value="tester">Tester</option>
                  <option value="voice_actor">Voice actor</option>
                  <option value="studio_director">Studio Director</option>
                  <option value="studio_owner">Studio Owner</option>
                  <option value="studio_manager">Studio Manager</option>
                </select>
              ) : (
                <span className={"role-badge role-" + member.role}>
                  {roleName(member.role)}
                </span>
              )}
              {canManage && member.role !== "workspace_owner" && (
                <button
                  className="remove-member"
                  onClick={() => {
                    if (
                      confirm(
                        "Remove this person from the workspace? They will lose access to its tasks and files.",
                      )
                    )
                      void remove("removeMember", member.id);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      {canManage && (
        <section className="panel">
          <div className="section-title">
            <h2>Pending invitations</h2>
            <span className="pill">{invitations.length}</span>
          </div>
          {invitations.length ? (
            <div className="pending-invites">
              {invitations.map((invite) => (
                <div key={invite.id}>
                  <div>
                    <strong>{invite.email}</strong>
                    <small>
                      {roleName(invite.role)} / Expires{" "}
                      {new Date(invite.expires * 1000).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    className="remove-member"
                    onClick={() => remove("revokeInvite", invite.id)}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="collaboration-caption">
              No pending invitations. Create a link above to grow your team.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
