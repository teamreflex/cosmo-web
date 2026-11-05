import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { sessionQuery } from "@/hooks/use-account";
import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { formatError } from "@/lib/client/errors";
import { currentAccountQuery } from "@/lib/queries/core";
import { hasDeliverableEmail } from "@/lib/universal/auth";
import type { CurrentUser } from "@/lib/universal/auth";
import {
  isCategoryEnabled,
  setCategoryEnabled,
} from "@apollo/trades/notifications";
import type { EmailNotificationCategory } from "@apollo/trades/notifications";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import { toast } from "sonner";
import { AccountSection } from "./account-section";
import { SendVerificationEmail } from "./verify-email";

type Props = {
  user: CurrentUser;
};

/**
 * The email opt-out switches. The section renders outside its Suspense
 * boundary so `/account#notifications` has an anchor as soon as the page does.
 */
export default function NotificationsSection({ user }: Props) {
  return (
    <AccountSection
      id="notifications"
      title={m.account_section_notifications()}
      description={m.account_notifications_description()}
    >
      <Suspense
        fallback={Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="px-4 py-4 sm:px-6">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      >
        <NotificationSwitches mask={user.emailNotifications} />
      </Suspense>
    </AccountSection>
  );
}

/**
 * Email verification is read from Better Auth's client session, as the
 * profile section does, because the account payload doesn't carry it.
 */
function NotificationSwitches({ mask }: { mask: number }) {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const queryClient = useQueryClient();
  const { queryKey } = currentAccountQuery;

  // optimistic, and the switches stay disabled until it settles, so each write starts from the stored mask
  const mutation = useMutation({
    mutationFn: async (emailNotifications: number) => {
      const result = await authClient.updateUser({ emailNotifications });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
    },
    onMutate: async (emailNotifications) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (account) =>
        account === undefined || account === null
          ? account
          : { ...account, user: { ...account.user, emailNotifications } },
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(formatError(error));
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  if (!user) {
    return null;
  }

  const categories = [
    {
      key: "offers",
      label: m.account_notifications_offers(),
      description: m.account_notifications_offers_description(),
    },
    {
      key: "activeTrades",
      label: m.account_notifications_active_trades(),
      description: m.account_notifications_active_trades_description(),
    },
    {
      key: "disputes",
      label: m.account_notifications_disputes(),
      description: m.account_notifications_disputes_description(),
    },
  ] satisfies {
    key: EmailNotificationCategory;
    label: string;
    description: string;
  }[];

  return (
    <>
      {!user.emailVerified && (
        <div className="px-4 py-4 sm:px-6">
          {/* a Twitter username stored in place of an email can't be verified */}
          {hasDeliverableEmail(user.email) ? (
            <SendVerificationEmail
              email={user.email}
              description={m.account_notifications_unverified()}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {m.account_notifications_no_email()}
            </p>
          )}
        </div>
      )}

      {categories.map((category) => (
        <div key={category.key} className="px-4 py-4 sm:px-6">
          <Field orientation="horizontal" data-disabled={!user.emailVerified}>
            <FieldContent>
              <FieldLabel htmlFor={`notifications-${category.key}`}>
                {category.label}
              </FieldLabel>
              <FieldDescription>{category.description}</FieldDescription>
            </FieldContent>
            <Switch
              id={`notifications-${category.key}`}
              checked={isCategoryEnabled(mask, category.key)}
              disabled={!user.emailVerified || mutation.isPending}
              onCheckedChange={(enabled) =>
                mutation.mutate(setCategoryEnabled(mask, category.key, enabled))
              }
            />
          </Field>
        </div>
      ))}
    </>
  );
}
