import { can } from "@apollo/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  loader: ({ context }) => {
    throw redirect({
      to: can(context.role, { site: ["manage"] })
        ? "/admin/events"
        : "/admin/reports",
    });
  },
});
