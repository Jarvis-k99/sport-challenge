"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createChallenge, type ChallengeFormState } from "../actions";

const initial: ChallengeFormState = {};

export type Opponent = { id: string; display_name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-purple-600 py-3 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send challenge"}
    </button>
  );
}

export default function NewChallengeForm({
  opponents,
}: {
  opponents: Opponent[];
}) {
  const [state, formAction] = useFormState(createChallenge, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Who?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {opponents.map((o) => (
            <label key={o.id} className="cursor-pointer">
              <input
                type="radio"
                name="target_id"
                value={o.id}
                required
                className="peer sr-only"
              />
              <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-2 py-3 text-center text-sm font-medium shadow-sm transition peer-checked:border-purple-500 peer-checked:bg-purple-50 peer-checked:text-purple-800 peer-checked:ring-2 peer-checked:ring-purple-500/20">
                {o.display_name}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          What’s the bet?
        </span>
        <textarea
          name="description"
          required
          maxLength={500}
          rows={3}
          placeholder="e.g. Lukas can do more push-ups than Moritz"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base shadow-sm focus:border-purple-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Amount (€)
        </span>
        <input
          name="amount_eur"
          type="number"
          min={1}
          max={1000}
          step="0.5"
          required
          inputMode="decimal"
          placeholder="10"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base shadow-sm focus:border-purple-500 focus:outline-none"
        />
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
