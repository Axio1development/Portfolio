import { useRef, useState } from "react";
import { ImagePlus, Link2, Trash2 } from "lucide-react";
export interface TaskReference {
  id: string;
  taskId: string;
  title: string;
  url: string;
  mime: string;
  bytes: number;
  created: string;
  addedBy: string;
}
export default function TaskReferences({
  references,
  canEdit,
  uploadLimit,
  onAdd,
  onRemove,
}: {
  references: TaskReference[];
  canEdit: boolean;
  uploadLimit: number;
  onAdd: (file: File | null, title: string, url: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(""),
    [url, setUrl] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function add() {
    setError("");
    if (!file && !url.trim()) {
      setError("Choose an image or video, or enter a reference link.");
      return;
    }
    if (file && file.size > uploadLimit) {
      setError(
        "This file exceeds the upload limit. Add a link for larger videos.",
      );
      return;
    }
    setBusy(true);
    try {
      await onAdd(file, title, url);
      setTitle("");
      setUrl("");
      setFile(null);
      if (input.current) input.current.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("Remove this task reference?")) return;
    setBusy(true);
    setError("");
    try {
      await onRemove(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="task-references">
      <h3>
        <ImagePlus size={17} />
        Task references <span>{references.length}</span>
      </h3>
      <p>
        Images, videos, and guidance for the work. These are separate from
        submitted work.
      </p>
      <div className="reference-grid">
        {references.map((item) => {
          const source = "/api.php?action=referenceMedia&id=" + item.id;
          return (
            <article key={item.id}>
              {item.url ? (
                <a
                  className="reference-link"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Link2 size={20} />
                  <span>Open reference link</span>
                </a>
              ) : item.mime.startsWith("image/") ? (
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={"View " + item.title}
                >
                  <img src={source} alt={item.title} loading="lazy" />
                </a>
              ) : (
                <video
                  src={source}
                  controls
                  preload="metadata"
                  playsInline
                  aria-label={item.title}
                />
              )}
              <div className="reference-caption">
                <strong>{item.title}</strong>
                <small>Added by {item.addedBy}</small>
                {canEdit && (
                  <button
                    type="button"
                    className="reference-remove"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                    aria-label={"Remove reference " + item.title}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!references.length && (
        <div className="reference-empty">No references attached yet.</div>
      )}
      {canEdit && (
        <div className="reference-compose">
          <label>
            Reference title (optional)
            <input
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Character movement example"
            />
          </label>
          <label>
            Reference image or video
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              disabled={busy || !!url}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <small>
            Up to {Math.floor(uploadLimit / 1048576)} MB per file. Use a link
            for larger videos.
          </small>
          <label>
            Or add a reference link
            <input
              type="url"
              value={url}
              disabled={busy || !!file}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={add}
          >
            {busy ? "Saving..." : "Add reference"}
          </button>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
