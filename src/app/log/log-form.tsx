"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addEntry, type LogState } from "./actions";
import type { WeekDay } from "@/lib/week";

const initial: LogState = {};

export type ActivityType = {
  id: number;
  name: string;
  emoji: string | null;
  sort_order: number;
};

type Props = {
  activityTypes: ActivityType[];
  days: WeekDay[];
  todayIso: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-bucket-500 py-3 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Logging…" : "Log session"}
    </button>
  );
}

export default function LogForm({ activityTypes, days, todayIso }: Props) {
  const [state, formAction] = useFormState(addEntry, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          What did you do?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {activityTypes.map((a) => (
            <label key={a.id} className="cursor-pointer">
              <input
                type="radio"
                name="activity_type_id"
                value={a.id}
                required
                className="peer sr-only"
              />
              <div className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2 py-3 text-center shadow-sm transition peer-checked:border-bucket-500 peer-checked:bg-bucket-50 peer-checked:ring-2 peer-checked:ring-bucket-500/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-bucket-500">
                <span className="text-2xl leading-none">{a.emoji ?? "•"}</span>
                <span className="text-xs font-medium text-neutral-700">
                  {a.name}
                </span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          When?
        </legend>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => (
            <label
              key={d.iso}
              className={d.isFuture ? "cursor-not-allowed" : "cursor-pointer"}
            >
              <input
                type="radio"
                name="activity_date"
                value={d.iso}
                defaultChecked={d.iso === todayIso}
                disabled={d.isFuture}
                required
                className="peer sr-only"
              />
              <div
                className={`flex flex-col items-center gap-0.5 rounded-xl border border-neutral-200 bg-white py-2 text-center shadow-sm transition
                  peer-checked:border-bucket-500 peer-checked:bg-bucket-50 peer-checked:ring-2 peer-checked:ring-bucket-500/20
                  peer-disabled:opacity-40`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  {d.weekday}
                </span>
                <span className="text-base font-bold text-neutral-800">
                  {d.dayNum}
                </span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

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
