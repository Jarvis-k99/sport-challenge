import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">🏋️ 404</h1>
      <p className="text-sm text-neutral-600">
        That page isn&apos;t part of the challenge.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-bucket-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
