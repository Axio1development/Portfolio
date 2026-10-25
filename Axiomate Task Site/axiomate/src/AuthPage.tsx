import type { Invitation } from "./types";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  Workflow,
} from "lucide-react";
import Brand from "./Brand";
export default function AuthPage({
  invitation,
  onSubmit,
  onPreview,
  busy,
  error,
}: {
  invitation?: Invitation | null;
  onSubmit: (
    mode: string,
    values: { name: string; email: string; password: string },
  ) => Promise<void>;
  onPreview: () => void;
  busy: boolean;
  error: string;
}) {
  const [mode, setMode] = useState("login");
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  return (
    <main className="login">
      <section className="story">
        <Brand />
        <div className="story-copy">
          <span className="product-tag">
            <span />
            WORK, WITH A CLEAR DIRECTION
          </span>
          <h1>
            From first idea.
            <br />
            To finished work.
          </h1>
          <p>
            A focused workspace to organize projects, track priorities, and make
            progress visible.
          </p>
          <div className="auth-preview">
            <div>
              <LayoutDashboard size={16} />
              <strong>Website launch</strong>
              <span className="pill">Sample board</span>
            </div>
            <div className="hero-columns">
              {[
                ["To do", "Design the next experience", "Design"],
                ["In progress", "Build something that matters", "Development"],
                ["Done", "Start with a clear plan", "Planning"],
              ].map(([column, title, label], index) => (
                <section key={column}>
                  <header>
                    <i className={"dot dot-" + index} />
                    {column}
                    <span>1</span>
                  </header>
                  <article>
                    <span className={"hero-label hero-label-" + index}>
                      {label}
                    </span>
                    <strong>{title}</strong>
                    <span className="preview-line" />
                    <span className="preview-line short" />
                    <footer>
                      <span className="avatar">
                        {["AL", "JK", "MR"][index]}
                      </span>
                      {index === 2 ? <Check size={14} /> : <span>Oct 28</span>}
                    </footer>
                  </article>
                </section>
              ))}
            </div>
          </div>
          <div className="hero-features">
            <span>
              <LayoutDashboard size={15} />
              Flexible boards
            </span>
            <span>
              <Workflow size={15} />
              Clear priorities
            </span>
            <span>
              <LockKeyhole size={15} />
              Private by default
            </span>
          </div>
        </div>
        <footer>
          AXIOMATE WORKSPACE<span>Built to keep work moving.</span>
        </footer>
      </section>
      <section className="login-panel">
        <div className="auth-top">
          <span className="secure">
            <LockKeyhole size={13} />
            SECURE ACCOUNT ACCESS
          </span>
        </div>
        <div>
          <span className="eyebrow">WELCOME TO AXIOMATE</span>
          <h2>
            {mode === "login"
              ? "Your next step starts here."
              : "Create your workspace."}
          </h2>
          <p>
            {mode === "login"
              ? "Sign in to organize your work and keep things moving."
              : "Create an account, choose a plan, and get organized."}
          </p>
          {invitation && (
            <div className="invitation-signin-note">
              You're invited to <strong>{invitation.workspaceName}</strong> as a{" "}
              {invitation.role.replaceAll("_", " ")}. Use{" "}
              <strong>{invitation.email}</strong> to join.
            </div>
          )}
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit(mode, values);
            }}
          >
            {mode === "register" && (
              <label>
                Your name
                <input
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  maxLength={80}
                  value={values.name}
                  onChange={(e) =>
                    setValues({ ...values, name: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  mode === "login"
                    ? "Enter your password"
                    : "At least 12 characters"
                }
                value={values.password}
                onChange={(e) =>
                  setValues({ ...values, password: e.target.value })
                }
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary signin" disabled={busy}>
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              <ArrowRight size={17} />
            </button>
          </form>
          <button
            className="text-button auth-toggle"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setValues({ ...values, password: "" });
            }}
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
          <div className="demo-invite">
            <div>
              <span className="demo-invite-icon">
                <Eye size={20} />
              </span>
              <div>
                <strong>Take a look around.</strong>
                <p>Explore a sample project. No account needed.</p>
              </div>
            </div>
            <button className="secondary" onClick={onPreview}>
              View live demo
              <ArrowRight size={16} />
            </button>
            <small>Read-only preview. Sample data only.</small>
          </div>
        </div>
        <footer>
          <span>Private workspaces. Clearer progress.</span>
          <span>axiomatedev.com</span>
        </footer>
      </section>
    </main>
  );
}
