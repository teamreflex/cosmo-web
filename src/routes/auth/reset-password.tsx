import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import ResetPassword from "@/components/auth/reset-password";
import { defineHead } from "@/lib/meta";

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: z.object({
    token: z.string(),
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ deps: { search } }) => {
    if (!search.token) {
      throw redirect({ to: "/" });
    }

    return {
      token: search.token,
    };
  },
  component: RouteComponent,
  head: () =>
    defineHead({ title: "Reset Password", canonical: "/auth/reset-password" }),
});

function RouteComponent() {
  const { token } = Route.useLoaderData();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex w-full items-center gap-2 pb-1">
        <h1 className="font-cosmo text-3xl uppercase">Reset Password</h1>
      </div>

      <div className="mx-auto w-full md:w-1/2">
        <ResetPassword token={token} />
      </div>
    </main>
  );
}
