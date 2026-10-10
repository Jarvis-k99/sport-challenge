"use client";

import { useRouter } from "next/navigation";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  /** Selected option value ("current" or an archived season id). */
  value: string;
  tab: string;
  user?: string;
};

/** Dropdown to switch the Statistics page between seasons. */
export default function SeasonPicker({ options, value, tab, user }: Props) {
  const router = useRouter();

  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-neutral-500">Season</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams({ tab });
          if (user) params.set("user", user);
          if (e.target.value !== "current") {
            params.set("season", e.target.value);
          }
          router.push(`/stats?${params.toString()}`, { scroll: false });
        }}
        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
