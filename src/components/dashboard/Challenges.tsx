import { formatCents } from "@/lib/format";
import {
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
} from "@/app/challenge/actions";

export type ChallengeRow = {
  id: string;
  challenger_id: string;
  challenger_name: string;
  target_id: string;
  target_name: string;
  description: string;
  amount_cents: number;
  status: "pending" | "active" | "declined" | "inactive";
  loser_id: string | null;
  loser_name: string | null;
  resolution_note: string | null;
  created_at: string;
  accepted_at: string | null;
  resolved_at: string | null;
};

type Props = {
  challenges: ChallengeRow[];
  currentUserId: string;
  currency: string;
};

export default function Challenges({
  challenges,
  currentUserId,
  currency,
}: Props) {
  const active = challenges.filter((c) => c.status === "active");
  const incomingPending = challenges.filter(
    (c) => c.status === "pending" && c.target_id === currentUserId,
  );
  const outgoingPending = challenges.filter(
    (c) => c.status === "pending" && c.challenger_id === currentUserId,
  );

  return (
    <div className="flex flex-col gap-6">
      {incomingPending.length > 0 ? (
        <Section title="Waiting on you">
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            {incomingPending.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 p-3">
                <Header challenge={c} currency={currency} />
                <p className="text-sm text-neutral-700">{c.description}</p>
                <div className="flex gap-2 pt-1">
                  <form action={acceptChallenge} className="flex-1">
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-bucket-500 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      Accept
                    </button>
                  </form>
                  <form action={declineChallenge} className="flex-1">
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {active.length > 0 ? (
        <Section title="Active challenges">
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-purple-200 bg-white shadow-sm">
            {active.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 p-3">
                <Header challenge={c} currency={currency} />
                <p className="text-sm text-neutral-700">{c.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {outgoingPending.length > 0 ? (
        <Section title="Sent (waiting on them)">
          <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {outgoingPending.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 p-3">
                <Header challenge={c} currency={currency} />
                <p className="text-sm text-neutral-700">{c.description}</p>
                <form action={cancelChallenge}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Header({
  challenge,
  currency,
}: {
  challenge: ChallengeRow;
  currency: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-semibold">
        {challenge.challenger_name}
        <span className="text-neutral-400"> vs </span>
        {challenge.target_name}
      </span>
      <span className="text-sm font-bold text-purple-700">
        {formatCents(challenge.amount_cents, currency)}
      </span>
    </div>
  );
}
