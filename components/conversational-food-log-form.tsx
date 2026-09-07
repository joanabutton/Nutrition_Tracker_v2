"use client";

import { useActionState, useState } from "react";

import {
  confirmConversationalFoodLog,
  parseConversationalFoodLog,
  type ConversationalFoodLogState
} from "@/app/(app)/food-actions";
import { getExternalFoodSourceLabel } from "@/lib/nutrition/food";

const initialState: ConversationalFoodLogState = {
  draft: null,
  encodedDraft: null,
  input: "",
  message: null
};

type ConversationalFoodLogFormProps = {
  embedded?: boolean;
};

export function ConversationalFoodLogForm({ embedded = false }: ConversationalFoodLogFormProps) {
  const [state, formAction, isPending] = useActionState(parseConversationalFoodLog, initialState);
  const draftKey = state.encodedDraft ?? "";
  const [reviewState, setReviewState] = useState<{
    draftKey: string;
    excludedIndexes: Set<number>;
    unitEdits: Record<number, string>;
  }>({
    draftKey: "",
    excludedIndexes: new Set(),
    unitEdits: {}
  });
  const excludedIndexes =
    reviewState.draftKey === draftKey ? reviewState.excludedIndexes : new Set<number>();
  const unitEdits = reviewState.draftKey === draftKey ? reviewState.unitEdits : {};
  const activeItems =
    state.draft?.items
      .map((item, index) => ({ index, item }))
      .filter(({ index }) => !excludedIndexes.has(index)) ?? [];
  const hasUnresolvedItems = activeItems.some(({ item }) => !item.resolved);
  const hasUnitMismatches = Boolean(
    activeItems.some(
      ({ index, item }) =>
        item.resolved &&
        normalizeUnit(unitEdits[index] ?? item.unit) !== normalizeUnit(item.resolved.servingUnit)
    )
  );
  const canConfirmDraft = Boolean(state.draft && activeItems.length > 0 && !hasUnresolvedItems && !hasUnitMismatches);

  return (
    <section className={embedded ? "grid gap-3" : "grid gap-3 rounded-lg bg-white/80 p-4 shadow-soft ring-1 ring-white/70"}>
      <form action={formAction} className="grid gap-3">
        {embedded ? null : (
          <div>
            <h2 className="text-lg font-semibold text-ink">Log food</h2>
          </div>
        )}

        <label className="grid gap-2 text-sm font-semibold text-ink">
          Food
          <textarea
            className="field min-h-24 resize-none leading-6"
            defaultValue={state.input}
            name="foodText"
            placeholder="Breakfast was a small bowl of oats with banana"
            required
          />
        </label>

        <button
          className="min-h-12 rounded-md bg-gradient-to-r from-rose via-lilac to-aqua px-4 text-base font-semibold text-ink shadow-sm disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "Reading..." : "Review log"}
        </button>
      </form>

      {state.message ? (
        <p className="rounded-md border border-butter/70 bg-butter/35 px-3 py-2 text-sm text-ink/70">
          {state.message}
        </p>
      ) : null}

      {state.draft && state.encodedDraft ? (
        <form action={confirmConversationalFoodLog} className="grid gap-3 border-t border-ink/10 pt-3">
          <input name="draft" type="hidden" value={state.encodedDraft} />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Meal
            <select className="field" defaultValue={state.draft.mealType} name="mealType" required>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </label>

          <div className="grid gap-2">
            {state.draft.items.map((item, index) => (
              <article
                className={
                  excludedIndexes.has(index)
                    ? "rounded-md border border-white/60 bg-white/35 p-3 opacity-60 shadow-sm"
                    : item.resolved?.kind === "estimated_food"
                    ? "rounded-md border border-butter/80 bg-butter/25 p-3 shadow-sm"
                    : "rounded-md border border-white/70 bg-white/75 p-3 shadow-sm"
                }
                key={`${item.inputName}-${index}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-ink/65">
                        <input
                          checked={!excludedIndexes.has(index)}
                          className="size-4 accent-moss"
                          name={`include_${index}`}
                          onChange={(event) => {
                            setReviewState((current) => {
                              const currentExcluded =
                                current.draftKey === draftKey
                                  ? current.excludedIndexes
                                  : new Set<number>();
                              const nextExcluded = new Set(currentExcluded);

                              if (event.target.checked) {
                                nextExcluded.delete(index);
                              } else {
                                nextExcluded.add(index);
                              }

                              return {
                                draftKey,
                                excludedIndexes: nextExcluded,
                                unitEdits: current.draftKey === draftKey ? current.unitEdits : {}
                              };
                            });
                          }}
                          type="checkbox"
                        />
                        Include
                      </label>
                      <p className="text-sm font-semibold text-ink">{item.inputName}</p>
                      {item.resolved?.kind === "estimated_food" ? (
                        <span className="rounded-full bg-butter px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/70">
                          Estimated
                        </span>
                      ) : null}
                    </div>
                    {item.resolved ? (
                      <p className="mt-1 text-xs text-ink/55">
                        {item.resolved.name}
                        {item.resolved.brand ? ` · ${item.resolved.brand}` : ""} ·{" "}
                        {formatResolutionSource(item.resolved)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-tomato">No match yet</p>
                    )}
                  </div>
                  {item.resolved ? (
                    <p className="text-sm font-semibold text-ink">
                      {Math.round(item.resolved.calories)} kcal/{item.resolved.servingQuantity}
                      {item.resolved.servingUnit}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-[1fr_6.5rem] gap-3">
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Quantity
                    <input
                      className="field"
                      defaultValue={item.quantity}
                      disabled={excludedIndexes.has(index)}
                      min="0.01"
                      name={`quantity_${index}`}
                      required
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Unit
                    <input
                      className="field"
                      defaultValue={item.unit}
                      disabled={excludedIndexes.has(index)}
                      name={`unit_${index}`}
                      onChange={(event) => {
                        setReviewState((current) => ({
                          draftKey,
                          excludedIndexes:
                            current.draftKey === draftKey
                              ? current.excludedIndexes
                              : new Set<number>(),
                          unitEdits: {
                            ...(current.draftKey === draftKey ? current.unitEdits : {}),
                            [index]: event.target.value
                          }
                        }));
                      }}
                      required
                    />
                  </label>
                </div>

                {item.warning ? (
                  <p className="mt-2 rounded-md bg-butter/30 px-3 py-2 text-xs leading-5 text-ink/60">
                    {item.warning}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          {hasUnresolvedItems ? (
            <p className="rounded-md border border-butter/70 bg-butter/35 px-3 py-2 text-sm text-ink/70">
              Resolve or remove unmatched items before adding this log.
            </p>
          ) : null}

          {hasUnitMismatches ? (
            <p className="rounded-md border border-butter/70 bg-butter/35 px-3 py-2 text-sm text-ink/70">
              Change highlighted units to match their database serving unit before adding.
            </p>
          ) : null}

          <button
            className="min-h-12 rounded-md bg-mint px-4 text-base font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConfirmDraft}
          >
            Add foods
          </button>
        </form>
      ) : null}
    </section>
  );
}

function normalizeUnit(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function formatResolutionSource(item: NonNullable<ConversationalFoodLogState["draft"]>["items"][number]["resolved"]) {
  if (!item) {
    return "";
  }

  if (item.kind === "saved_food") {
    return "Saved food";
  }

  if (item.kind === "estimated_food") {
    return "Estimated";
  }

  return getExternalFoodSourceLabel(item.externalSource);
}
