import Brand from "./Brand";
export { default as Brand } from "./Brand";
export { default as AuthPage } from "./AuthPage";
import { ArrowRight, Check, LogOut } from "lucide-react";
import type { Account, PlanId } from "./types";
export const plans = [
  {
    id: "starter" as PlanId,
    name: "Starter",
    detail: "A clear space for everyday work.",
    limit: "50 tasks",
    features: [
      "Board and list views",
      "Due dates and priorities",
      "Checklists and activity",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    detail: "More room for bigger projects.",
    limit: "500 tasks",
    features: [
      "Everything in Starter",
      "Higher task capacity",
      "Switch plans anytime",
    ],
  },
  {
    id: "business" as PlanId,
    name: "Business",
    detail: "Space for your next chapter.",
    limit: "5,000 tasks",
    features: [
      "Everything in Pro",
      "Custom pricing based on need",
      "Switch plans anytime",
    ],
  },
];
export function PlanPicker({
  user,
  busy,
  error,
  onSelect,
  onBack,
}: {
  user: Account;
  busy: boolean;
  error: string;
  onSelect: (id: PlanId) => void;
  onBack: () => void;
}) {
  return (
    <main className="onboarding">
      <header>
        <Brand />
        <button className="text-button" onClick={onBack}>
          <LogOut size={15} />
          {user.plan ? "Back to workspace" : "Sign out"}
        </button>
      </header>
      <section className="plan-heading">
        <span className="eyebrow">YOUR WORKSPACE, YOUR PACE</span>
        <h1>A little room to get things done.</h1>
        <p>
          Choose the task capacity that fits your work. You can change it later.
        </p>
        <span className="preview-notice">
          Plan preview · No payment is collected. Pricing has not been set.
        </span>
      </section>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <section className="plan-grid">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={"plan-card " + (plan.id === "pro" ? "featured" : "")}
          >
            <div className="plan-card-top">
              <span className="eyebrow">{plan.name.toUpperCase()}</span>
              {plan.id === "pro" && <span className="pill">Room to grow</span>}
            </div>
            <h2>{plan.name}</h2>
            <p>{plan.detail}</p>
            <div className="plan-price">
              {plan.id === "business"
                ? "Custom pricing"
                : "Pricing coming soon"}
              <small>
                {plan.id === "business"
                  ? "Based on your needs"
                  : "No payment collected during preview"}
              </small>
            </div>
            <div className="plan-capacity">
              {plan.limit}
              <small>per private workspace</small>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              disabled={busy || user.plan === plan.id}
              className={plan.id === "pro" ? "primary" : "secondary"}
              onClick={() => onSelect(plan.id)}
            >
              {user.plan === plan.id ? "Current plan" : `Choose ${plan.name}`}
              <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </section>
      <footer className="plan-footer">
        Signed in as {user.email}
        <span>
          Account ID: <code>{user.id}</code>
        </span>
      </footer>
    </main>
  );
}
