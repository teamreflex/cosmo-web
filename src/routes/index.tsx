import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-dvh w-screen flex items-center justify-center flex-col gap-y-4 p-4">
      <img
        className="max-w-sm w-full"
        src="https://raw.githubusercontent.com/tanstack/tanstack.com/main/src/images/splash-dark.png"
        alt="TanStack Logo"
      />
      <h1>
        <span className="line-through">Next.js</span> TanStack Start
      </h1>
      <a
        className="bg-foreground text-background rounded-full px-4 py-1 hover:opacity-90"
        href="https://tanstack.com/start/latest"
        target="_blank"
      >
        Docs
      </a>
    </main>
  );
}
