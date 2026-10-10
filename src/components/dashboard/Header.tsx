type Props = {
  displayName: string;
  isAdmin: boolean;
  seasonName?: string;
};

export default function Header({ displayName, isAdmin, seasonName }: Props) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🏋️ Sport Challenge</h1>
        <p className="text-sm text-neutral-500">
          Hey, {displayName}
          {isAdmin ? " (admin)" : ""}.
          {seasonName ? (
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {seasonName}
            </span>
          ) : null}
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
