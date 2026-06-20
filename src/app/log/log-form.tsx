"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addEntry, type LogState } from "./actions";
import type { WeekDay } from "@/lib/week";

const initial: LogState = {};
const MAX_NOTE = 200;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

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

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-bucket-500 py-3 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Logging…" : "Log session"}
    </button>
  );
}

export default function LogForm({ activityTypes, days, todayIso }: Props) {
  const [state, formAction] = useFormState(addEntry, initial);
  const [noteLen, setNoteLen] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be under 4 MB.");
      e.target.value = "";
      setPhotoPreview(null);
      return;
    }
    // Free any previous preview URL to avoid memory leaks.
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="flex flex-col gap-5"
    >
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
              <div className="flex flex-col items-center gap-0.5 rounded-xl border border-neutral-200 bg-white py-2 text-center shadow-sm transition peer-checked:border-bucket-500 peer-checked:bg-bucket-50 peer-checked:ring-2 peer-checked:ring-bucket-500/20 peer-disabled:opacity-40">
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

      <label className="flex flex-col gap-1">
        <span className="flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-neutral-500">
          <span>Note (optional)</span>
          <span
            className={`text-xs ${
              noteLen > MAX_NOTE ? "text-red-600" : "text-neutral-400"
            }`}
          >
            {noteLen}/{MAX_NOTE}
          </span>
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={MAX_NOTE}
          placeholder="e.g. 7 km easy along the river"
          onChange={(e) => setNoteLen(e.target.value.length)}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base shadow-sm focus:border-bucket-500 focus:outline-none"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Photo (optional)
        </span>

        {/* One persistent file input — never unmounted — so the
            selected File survives the UI swap between picker and
            preview, and goes through with the form submit. */}
        <input
          ref={photoInputRef}
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="sr-only"
        />

        {photoPreview ? (
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Selected"
              className="block max-h-72 w-full object-cover"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white py-4 text-sm font-medium text-neutral-600 shadow-sm transition hover:border-bucket-500 hover:text-bucket-700"
          >
            ＋ Add photo
          </button>
        )}

        {photoError ? (
          <p className="text-xs text-red-600">{photoError}</p>
        ) : null}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton disabled={!!photoError || noteLen > MAX_NOTE} />
    </form>
  );
}
