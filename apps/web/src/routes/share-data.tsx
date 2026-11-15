import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/share-data")({
  beforeLoad: () => {
    throw redirect({ to: "/account", hash: "share-data", statusCode: 301 });
  },
});
