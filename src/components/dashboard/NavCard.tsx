import Link from "next/link";

type Props = {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
};

export default function NavCard({ href, icon, title, subtitle }: Props) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-neutral-300"
    >
      <span className="text-3xl leading-none">{icon}</span>
      <div className="flex flex-1 flex-col">
        <span className="text-base font-semibold text-neutral-900">
          {title}
        </span>
        <span className="text-xs text-neutral-500">{subtitle}</span>
      </div>
      <span className="text-xl text-neutral-400">→</span>
    </Link>
  );
}
