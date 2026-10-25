import { useState } from "react";
import { ArrowLeftRight, Check, X } from "lucide-react";
import type { Task, TaskOffer } from "./types";
import { money, hourlyEstimate, hoursLabel } from "./pricing";
export default function TaskNegotiation({
  task,
  offers,
  userId,
  canPropose,
  onPropose,
  onRespond,
}: {
  task: Task;
  offers: TaskOffer[];
  userId: string;
  canPropose: boolean;
  onPropose: (minutes: number, rate: number, message: string) => Promise<void>;
  onRespond: (
    id: string,
    decision: "accepted" | "declined",
    note: string,
  ) => Promise<void>;
}) {
  const pending = offers.find((offer) => offer.status === "pending"),
    [open, setOpen] = useState(false),
    [hours, setHours] = useState((task.plannedMinutes || 60) / 60),
    [rate, setRate] = useState((task.hourlyRateCents || 0) / 100),
    [message, setMessage] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function propose() {
    setBusy(true);
    setError("");
    try {
      if (hours <= 0) throw Error("Enter positive planned hours.");
      await onPropose(Math.round(hours * 60), Math.round(rate * 100), message);
      setOpen(false);
      setMessage("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function respond(decision: "accepted" | "declined") {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      await onRespond(pending.id, decision, note);
      setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="task-negotiation">
      <h3>
        <ArrowLeftRight size={16} />
        Negotiate hours & rate
      </h3>
      <p className="pricing-caption">
        The workspace owner and assigned collaborator can send proposals and
        counteroffers. Task and board totals change only after the recipient
        accepts.
      </p>
      {pending && (
        <div className="pending-offer">
          <div>
            <span className="offer-badge">Proposal awaiting response</span>
            <strong>
              {hoursLabel(pending.plannedMinutes)} hours at{" "}
              {money(pending.hourlyRateCents)}/hour
            </strong>
            <span className="offer-total">
              {money(
                hourlyEstimate(pending.plannedMinutes, pending.hourlyRateCents),
              )}{" "}
              estimated
            </span>
            <small>
              {pending.proposer} → {pending.recipient}
            </small>
            {pending.message && <p>{pending.message}</p>}
          </div>
          {pending.recipientId === userId && canPropose ? (
            <>
              <label>
                Response note <span>(optional)</span>
                <textarea
                  aria-label="Response note"
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="offer-actions">
                <button
                  className="primary"
                  type="button"
                  disabled={busy}
                  onClick={() => respond("accepted")}
                >
                  <Check size={15} />
                  Accept proposal
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => respond("declined")}
                >
                  <X size={15} />
                  Decline proposal
                </button>
              </div>
            </>
          ) : (
            <p className="pricing-caption">
              Waiting for {pending.recipient} to respond.
            </p>
          )}
        </div>
      )}
      {canPropose &&
        (!open ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setHours(
                (pending?.plannedMinutes || task.plannedMinutes || 60) / 60,
              );
              setRate(
                (pending?.hourlyRateCents ?? task.hourlyRateCents ?? 0) / 100,
              );
              setOpen(true);
            }}
          >
            <ArrowLeftRight size={15} />
            {pending ? "Send a counteroffer" : "Propose different terms"}
          </button>
        ) : (
          <div className="offer-form">
            <div className="form-grid">
              <label>
                Proposed hours
                <input
                  aria-label="Proposed hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </label>
              <label>
                Proposed hourly rate / USD
                <input
                  aria-label="Proposed hourly rate / USD"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </label>
            </div>
            <label>
              Proposal message <span>(optional)</span>
              <textarea
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain your proposed hours or rate."
              />
            </label>
            <p className="proposed-total">
              Proposed total:{" "}
              <strong>
                {money(
                  hourlyEstimate(
                    Math.round(hours * 60),
                    Math.round(rate * 100),
                  ),
                )}
              </strong>
            </p>
            <div className="offer-actions">
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={propose}
              >
                {busy ? "Sending..." : "Send proposal"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {offers.length > 0 && (
        <div className="negotiation-history">
          <h4>Negotiation history</h4>
          {offers.map((offer) => (
            <article key={offer.id}>
              <div>
                <span className={"offer-badge offer-" + offer.status}>
                  {offer.status}
                </span>
                <strong>
                  {hoursLabel(offer.plannedMinutes)} h ×{" "}
                  {money(offer.hourlyRateCents)}/h
                </strong>
                <span>
                  {money(
                    hourlyEstimate(offer.plannedMinutes, offer.hourlyRateCents),
                  )}
                </span>
              </div>
              <small>
                {offer.proposer} / {new Date(offer.created).toLocaleString()}
                {offer.decidedBy ? " / " + offer.decidedBy : ""}
              </small>
              {offer.message && <p>{offer.message}</p>}
              {offer.decisionNote && (
                <p className="offer-response">{offer.decisionNote}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
