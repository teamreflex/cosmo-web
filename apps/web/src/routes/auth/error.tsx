import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { EMAIL_REQUIRED_ERROR } from "@/lib/universal/auth";
import { IconUserExclamation } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as z from "zod";

/**
 * Where Better Auth sends an OAuth sign-in or account link that it refused,
 * with the reason in `error`.
 */
export const Route = createFileRoute("/auth/error")({
  validateSearch: z.object({
    error: z.string().optional(),
  }),
  head: () =>
    defineHead({
      title: m.auth_sign_in_error_title(),
      canonical: "/auth/error",
      denyRobots: true,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { error } = Route.useSearch();

  return (
    <main className="container flex flex-col py-6 md:py-12">
      <Empty className="mx-auto w-full max-w-md p-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUserExclamation />
          </EmptyMedia>
          <EmptyTitle className="text-base">
            {m.auth_sign_in_error_title()}
          </EmptyTitle>
          <EmptyDescription>{describeError(error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/" className={buttonVariants()}>
            {m.delete_account_back_home()}
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

function describeError(error: string | undefined) {
  switch (error) {
    case EMAIL_REQUIRED_ERROR:
      return m.auth_sign_in_error_email_required();
    // Better Auth's own code for a provider that returned no email (Discord)
    case "email_not_found":
      return m.auth_sign_in_error_email_not_found();
    case "BANNED_USER":
      return m.auth_error_banned();
    default:
      return m.auth_sign_in_error_unknown();
  }
}
