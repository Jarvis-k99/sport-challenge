import Link from "next/link";

type Person = { id: string; display_name: string };

type Props = {
  people: Person[];
  selectedId: string;
};

export default function UserPicker({ people, selectedId }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {people.map((p) => {
          const active = p.id === selectedId;
          return (
            <li key={p.id}>
              <Link
                href={`/stats?tab=breakdown&user=${p.id}`}
                scroll={false}
                className={`block whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700"
                }`}
              >
                {p.display_name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
