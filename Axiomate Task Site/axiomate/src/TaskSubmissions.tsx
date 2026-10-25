import SubmissionReview from "./SubmissionReview";
import type { ReviewDecision } from "./SubmissionReview";
import { useRef, useState } from "react";
import { Download, FileUp, Paperclip } from "lucide-react";
import type { Submission } from "./types";
export default function TaskSubmissions({
  submissions,
  canSubmit,
  uploadLimit,
  onUpload,
  canReview,
  onReview,
}: {
  canReview: boolean;
  onReview: (
    id: string,
    decision: ReviewDecision,
    feedback: string,
  ) => Promise<void>;
  submissions: Submission[];
  canSubmit: boolean;
  uploadLimit: number;
  onUpload: (file: File, note: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file.size > uploadLimit)
        throw Error("Choose a file within the upload limit.");
      await onUpload(file, note);
      setFile(null);
      setNote("");
      if (input.current) input.current.value = "";
      setMessage("Work submitted. The task is ready for review.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="task-submissions">
      <h3>
        <Paperclip size={16} />
        Work submissions<span>{submissions.length}</span>
      </h3>
      {submissions.length ? (
        <div className="submission-list">
          {submissions.map((submission, index) => (
            <article key={submission.id}>
              <div>
                <span className="submission-file-icon">
                  <Paperclip size={16} />
                </span>
                <div>
                  <a
                    href={
                      "/api.php?action=download&id=" +
                      encodeURIComponent(submission.id)
                    }
                  >
                    {submission.filename}
                  </a>
                  <small>
                    {submission.submittedBy} /{" "}
                    {new Date(submission.created).toLocaleString()} /{" "}
                    {(submission.bytes / 1024).toFixed(1)} KB
                  </small>
                </div>
                <a
                  className="download-file"
                  aria-label={"Download " + submission.filename}
                  href={
                    "/api.php?action=download&id=" +
                    encodeURIComponent(submission.id)
                  }
                >
                  <Download size={16} />
                </a>
              </div>
              {submission.note && <p>{submission.note}</p>}
              <div
                className={"review-result review-" + submission.reviewStatus}
              >
                <span className="review-status">
                  {index > 0 && submission.reviewStatus === "pending"
                    ? "Older version"
                    : {
                        pending: "Awaiting review",
                        approved: "Approved",
                        denied: "Denied",
                        changes_requested: "Changes requested",
                      }[submission.reviewStatus]}
                </span>
                {submission.reviewedBy && (
                  <small>
                    Reviewed by {submission.reviewedBy}
                    {submission.reviewedAt
                      ? " / " + new Date(submission.reviewedAt).toLocaleString()
                      : ""}
                  </small>
                )}
                {submission.reviewNote && <p>{submission.reviewNote}</p>}
              </div>
              {canReview &&
                index === 0 &&
                submission.reviewStatus === "pending" && (
                  <SubmissionReview
                    key={submission.id}
                    submissionId={submission.id}
                    onReview={onReview}
                  />
                )}
            </article>
          ))}
        </div>
      ) : (
        <p className="collaboration-caption">No files submitted yet.</p>
      )}
      {canSubmit ? (
        <div className="submission-upload">
          <label>
            Attach your work
            <input
              ref={input}
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setMessage("");
              }}
            />
          </label>
          <small>
            Up to {Math.floor(uploadLimit / 1048576)} MB per file. Uploading
            moves this task to In review.
          </small>
          <label>
            Submission note <span>(optional)</span>
            <textarea
              maxLength={2000}
              placeholder="What should the reviewer know?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary"
            disabled={busy || !file}
            onClick={submit}
          >
            <FileUp size={16} />
            {busy ? "Uploading..." : "Submit work"}
          </button>
        </div>
      ) : (
        <p className="submission-access">
          Only the assigned individual can submit work. Completed tasks must be
          reopened before another submission.
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <p className="submission-success" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
