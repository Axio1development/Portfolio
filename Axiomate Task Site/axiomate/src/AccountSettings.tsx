import { useState } from "react";
import { Check, Copy, CreditCard, KeyRound, UserRound } from "lucide-react";
import { plans } from "./Onboarding";
import type { Account, Activity } from "./types";
export default function AccountSettings({
  user,
  activity,
  onPlans,
  onPassword,
}: {
  user: Account;
  activity: Activity[];
  onPlans: () => void;
  onPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setNext] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const plan = plans.find((plan) => plan.id === user.plan);
  return (
    <div className="settings-grid">
      <section className="panel">
        <div className="section-title">
          <h2>
            <UserRound size={17} />
            Your account
          </h2>
          <span className="pill">
            {user.role === "owner" ? "Site owner" : "Personal account"}
          </span>
        </div>
        <dl className="account-details">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Account ID</dt>
            <dd className="account-id">
              <code>{user.id}</code>
              <button
                aria-label="Copy account ID"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(user.id);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  } catch {
                    setMessage("Select and copy the account ID shown above.");
                  }
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </dd>
          </div>
        </dl>
        <p className="settings-note">
          Your account ID is permanent. Site ownership can only be assigned by
          an administrator through the server.
        </p>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>
            <CreditCard size={17} />
            Your plan
          </h2>
          <span className="pill">
            {user.role === "owner"
              ? "Owner / Unlimited"
              : plan?.name || "Collaborator"}
          </span>
        </div>
        <h3 className="settings-plan-title">
          {user.role === "owner"
            ? "Unlimited owner access."
            : !user.plan
              ? "Team access included."
              : `Room for ${plan?.limit.toLowerCase()}.`}
        </h3>
        {user.role === "owner" ? (
          <p className="settings-note">
            Your owner account has unlimited tasks and workspaces, with no plan
            restrictions or subscription required.
          </p>
        ) : (
          <>
            <p className="settings-note">
              {!user.plan
                ? "Access to invited workspaces is included. Choose a plan to create your own workspaces."
                : user.plan === "business"
                  ? "Custom pricing based on your needs."
                  : "Pricing has not been set."}{" "}
              No payment is collected during this preview.
            </p>
            <button className="secondary" onClick={onPlans}>
              Manage plan
            </button>
          </>
        )}
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>
            <KeyRound size={17} />
            Password
          </h2>
        </div>
        <form
          className="auth-form password-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await onPassword(currentPassword, newPassword);
              setCurrent("");
              setNext("");
              setMessage("Password updated.");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            New password
            <input
              required
              minLength={12}
              maxLength={200}
              type="password"
              autoComplete="new-password"
              placeholder="At least 12 characters"
              value={newPassword}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Updating..." : "Update password"}
          </button>
        </form>
        {message && (
          <p className="settings-note" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel activity">
        <h3>Recent activity</h3>
        {activity.length ? (
          activity.map((a, i) => (
            <div key={i}>
              <span>{a.message}</span>
              <time>{new Date(a.created).toLocaleString()}</time>
            </div>
          ))
        ) : (
          <p>Your workspace updates will appear here.</p>
        )}
      </section>
    </div>
  );
}
