import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import ResetPassword from "@/components/auth/reset-password";

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
});

function RouteComponent() {
  const { token } = Route.useLoaderData();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex gap-2 items-center w-full pb-1">
        <h1 className="text-3xl font-cosmo uppercase">Reset Password</h1>
      </div>

      <div className="w-full md:w-1/2 mx-auto">
        <ResetPassword token={token} />
      </div>
    </main>
  );
}
