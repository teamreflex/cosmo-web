import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/objekts/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
