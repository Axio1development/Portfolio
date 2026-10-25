import type { Task } from "./types";
import { money, hourlyEstimate, hoursLabel } from "./pricing";
export default function TaskPricing({
  task,
  onChange,
  canManage,
  locked,
}: {
  task: Task;
  onChange: (task: Task) => void;
  canManage: boolean;
  locked: boolean;
}) {
  const mode = task.pricingMode || "fixed";
  const disabled = !canManage || locked;
  function hourly(minutes: number, rate: number) {
    onChange({
      ...task,
      plannedMinutes: minutes,
      hourlyRateCents: rate,
      priceCents: hourlyEstimate(minutes, rate),
    });
  }
  return (
    <section className="task-pricing">
      <h3>Hours & pay</h3>
      <label>
        Pricing type
        <select
          aria-label="Pricing type"
          disabled={disabled}
          value={mode}
          onChange={(e) => {
            const value = e.target.value as "fixed" | "hourly";
            onChange({
              ...task,
              pricingMode: value,
              plannedMinutes: 0,
              hourlyRateCents: 0,
              priceCents: 0,
            });
          }}
        >
          <option value="fixed">Fixed task price</option>
          <option value="hourly">Planned hours × hourly rate</option>
        </select>
      </label>
      {mode === "fixed" ? (
        <label>
          Task price / USD
          <input
            aria-label="Task price / USD"
            type="number"
            min="0"
            step="0.01"
            disabled={disabled}
            value={(task.priceCents || 0) / 100}
            onChange={(e) =>
              onChange({
                ...task,
                priceCents: Math.round(Number(e.target.value) * 100),
              })
            }
          />
        </label>
      ) : (
        <>
          <div className="form-grid">
            <label>
              Planned hours
              <input
                aria-label="Planned hours"
                type="number"
                min="0"
                step="0.25"
                disabled={disabled}
                value={(task.plannedMinutes || 0) / 60}
                onChange={(e) =>
                  hourly(
                    Math.round(Number(e.target.value) * 60),
                    task.hourlyRateCents || 0,
                  )
                }
              />
            </label>
            <label>
              Hourly rate / USD
              <input
                aria-label="Hourly rate / USD"
                type="number"
                min="0"
                step="0.01"
                disabled={disabled}
                value={(task.hourlyRateCents || 0) / 100}
                onChange={(e) =>
                  hourly(
                    task.plannedMinutes || 0,
                    Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            </label>
          </div>
          <div className="hourly-estimate">
            <span>PLANNED TASK TOTAL</span>
            <strong>
              {money(
                hourlyEstimate(
                  task.plannedMinutes || 0,
                  task.hourlyRateCents || 0,
                ),
              )}
            </strong>
            <small>
              {hoursLabel(task.plannedMinutes || 0)} hours ×{" "}
              {money(task.hourlyRateCents || 0)}/hour
            </small>
          </div>
          <p className="pricing-caption">
            This is a planned budget. Recorded clock time is tracked separately.
          </p>
        </>
      )}
      {locked && (
        <p className="pricing-lock-note">
          These terms were accepted. Use the negotiation controls below to
          propose changes.
        </p>
      )}
    </section>
  );
}
