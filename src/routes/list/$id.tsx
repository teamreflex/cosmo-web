import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/list/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/list/$id"!</div>;
}
