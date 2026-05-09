import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-[80vh] flex-col justify-center gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">🏋️ Sport Challenge</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign in to log activities and watch the bucket grow.
        </p>
      </header>
      <LoginForm />
    </main>
  );
}
