type Props = {
  displayName: string;
  isAdmin: boolean;
};

export default function Header({ displayName, isAdmin }: Props) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🏋️ Sport Challenge</h1>
        <p className="text-sm text-neutral-500">
          Hey, {displayName}
          {isAdmin ? " (admin)" : ""}.
        </p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 shadow-sm transition hover:bg-neutral-100"
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
