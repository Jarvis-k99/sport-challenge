"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  resolveChallenge,
  type ChallengeFormState,
} from "@/app/challenge/actions";

const initial: ChallengeFormState = {};

type Person = { id: string; name: string };
type Props = {
  challengeId: string;
  challenger: Person;
  target: Person;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Resolving…" : "Resolve"}
    </button>
  );
}

export default function ResolveForm({ challengeId, challenger, target }: Props) {
  const [state, formAction] = useFormState(resolveChallenge, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={challengeId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Loser pays
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[challenger, target].map((p) => (
            <label key={p.id} className="cursor-pointer">
              <input
                type="radio"
                name="loser_id"
                value={p.id}
                required
                className="peer sr-only"
              />
              <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium shadow-sm transition peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700">
                {p.name}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Note (optional)
        </span>
        <input
          name="resolution_note"
          maxLength={200}
          placeholder="e.g. Lukas: 47, Moritz: 41"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none"
        />
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
