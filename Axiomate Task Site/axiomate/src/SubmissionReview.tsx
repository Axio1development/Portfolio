import { useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";
export type ReviewDecision = "approved" | "denied" | "changes_requested";
export default function SubmissionReview({
  submissionId,
  onReview,
}: {
  submissionId: string;
  onReview: (
    id: string,
    decision: ReviewDecision,
    feedback: string,
  ) => Promise<void>;
}) {
  const [decision, setDecision] = useState<ReviewDecision>("approved"),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function review() {
    setError("");
    if (decision !== "approved" && !feedback.trim()) {
      setError("Add feedback so the assigned person knows what to change.");
      return;
    }
    setBusy(true);
    try {
      await onReview(submissionId, decision, feedback);
      setFeedback("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="submission-review">
      <h4>Review this submission</h4>
      <p>Choose an outcome for the latest version of the work.</p>
      <div className="review-options">
        <button
          type="button"
          className={decision === "approved" ? "selected approved" : ""}
          aria-pressed={decision === "approved"}
          onClick={() => setDecision("approved")}
        >
          <Check size={14} />
          Approve
        </button>
        <button
          type="button"
          className={decision === "changes_requested" ? "selected changes" : ""}
          aria-pressed={decision === "changes_requested"}
          onClick={() => setDecision("changes_requested")}
        >
          <MessageSquare size={14} />
          Request changes
        </button>
        <button
          type="button"
          className={decision === "denied" ? "selected denied" : ""}
          aria-pressed={decision === "denied"}
          onClick={() => setDecision("denied")}
        >
          <X size={14} />
          Deny
        </button>
      </div>
      <label>
        Review feedback{" "}
        <span>{decision === "approved" ? "(optional)" : "(required)"}</span>
        <textarea
          maxLength={4000}
          placeholder={
            decision === "approved"
              ? "Add a note about the approved work..."
              : "Explain what needs to change or why this work is denied..."
          }
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <button
        type="button"
        className="primary"
        disabled={busy}
        onClick={review}
      >
        {busy
          ? "Saving decision..."
          : decision === "approved"
            ? "Approve work"
            : decision === "denied"
              ? "Deny work"
              : "Send change request"}
      </button>
    </div>
  );
}
