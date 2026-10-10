"use client";

import { useState } from "react";
import Image from "next/image";
import { avatarUrl } from "@/lib/avatar";

type Props = {
  name: string;
  /** Diameter in px. */
  size?: number;
  className?: string;
};

/**
 * Round avatar for a player. Falls back to the first letter on a neutral
 * circle when no picture exists for that name (e.g. a newly added player).
 */
export default function Avatar({ name, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (failed) {
    return (
      <span
        aria-hidden
        style={{ ...box, fontSize: Math.round(size * 0.42) }}
        className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-600 ${className}`}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={avatarUrl(name)}
      alt={name}
      width={size}
      height={size}
      // Files are already tiny (~10 KB); skip the image optimizer.
      unoptimized
      onError={() => setFailed(true)}
      style={box}
      className={`shrink-0 rounded-full bg-neutral-100 object-cover ${className}`}
    />
  );
}
