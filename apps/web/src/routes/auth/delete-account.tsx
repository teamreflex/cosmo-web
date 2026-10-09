import DeletionBlockerRows from "@/components/auth/account/deletion-blockers";
import SignIn from "@/components/auth/sign-in";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteAccount } from "@/lib/functions/account";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery, removeViewerQueries } from "@/lib/queries/core";
import {
  type DeletionBlocked,
  deletionBlockerCount,
} from "@/lib/universal/account-deletion";
import type { AccountErrorCode } from "@/lib/universal/errors/accounts";
import type { PropsWithClassName } from "@/lib/utils";
import {
  IconLinkOff,
  IconLoader2,
  IconLogin2,
  IconUserOff,
} from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import * as z from "zod";

export const Route = createFileRoute("/auth/delete-account")({
  validateSearch: z.object({
    token: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ context, deps: { token } }) => {
    if (!token) {
      throw redirect({ to: "/" });
    }

    await context.queryClient.ensureQueryData(currentAccountQuery);
    return { token };
  },
  head: () =>
    defineHead({
      title: m.delete_account_title(),
      canonical: "/auth/delete-account",
      denyRobots: true,
    }),
  component: RouteComponent,
});

type PageState =
  | { kind: "idle" }
  | { kind: "blocked"; blockers: DeletionBlocked["blockers"] }
  | { kind: "invalid" }
  | { kind: "deleted" };

/**
 * The emailed link only opens this page; the account is deleted when its
 * button POSTs the token, so link scanners and restored tabs can't delete it.
 */
function RouteComponent() {
  const { token } = Route.useLoaderData();
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "idle" });

  const mutation = useMutation({
    mutationFn: () => $deleteAccount({ data: { token } }),
    onSuccess: async (result) => {
      if (result.status === "blocked") {
        setState({ kind: "blocked", blockers: result.blockers });
        return;
      }

      // before signing out, so the done state outlives the session
      setState({ kind: "deleted" });
      queryClient.setQueryData(currentAccountQuery.queryKey, null);
      removeViewerQueries(queryClient);
      await router.invalidate();
    },
    onError: (error) => {
      if (
        error.message ===
        ("account_deletion_link_invalid" satisfies AccountErrorCode)
      ) {
        setState({ kind: "invalid" });
      } else {
        toast.error(formatError(error));
      }
    },
  });

  return (
    <main className="container flex flex-col py-6 md:py-12">
      <div className="mx-auto w-full max-w-md">
        {state.kind === "deleted" ? (
          <Notice
            icon={<IconUserOff />}
            title={m.delete_account_done_title()}
            description={m.delete_account_done_description()}
          >
            <BackHome />
          </Notice>
        ) : account === null ? (
          <Notice
            icon={<IconLogin2 />}
            title={m.delete_account_title()}
            description={m.delete_account_sign_in_required()}
          >
            <SignIn trigger={<Button>{m.auth_sign_in()}</Button>} />
          </Notice>
        ) : state.kind === "invalid" ? (
          <Notice
            icon={<IconLinkOff />}
            title={m.delete_account_link_invalid_title()}
            description={m.delete_account_link_invalid_description()}
          >
            <BackHome variant="outline" />
          </Notice>
        ) : state.kind === "blocked" ? (
          <Card>
            <CardHeader>
              <CardTitle>{m.delete_account_blocked_title()}</CardTitle>
              <CardDescription>
                {m.delete_account_blocked_description({
                  count: deletionBlockerCount(state.blockers),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeletionBlockerRows blockers={state.blockers} />
            </CardContent>
            <CardFooter className="justify-end">
              <BackHome
                variant="outline"
                className="max-sm:h-11 max-sm:w-full"
              />
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{m.delete_account_confirm_title()}</CardTitle>
              <CardDescription>
                {m.delete_account_finish_description()}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link
                to="/"
                className={buttonVariants({
                  variant: "secondary",
                  className: "max-sm:h-11 max-sm:w-full",
                })}
              >
                {m.common_cancel()}
              </Link>
              <Button
                variant="destructive"
                className="max-sm:h-11 max-sm:w-full"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                <span>{m.delete_account_finish_submit()}</span>
                {mutation.isPending && <IconLoader2 className="animate-spin" />}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  );
}

type BackHomeProps = PropsWithClassName<{
  variant?: "default" | "outline";
}>;

function BackHome({ variant, className }: BackHomeProps) {
  return (
    <Link to="/" className={buttonVariants({ variant, className })}>
      {m.delete_account_back_home()}
    </Link>
  );
}

type NoticeProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
};

function Notice({ icon, title, description, children }: NoticeProps) {
  return (
    <Empty className="p-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
