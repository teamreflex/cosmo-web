import { listAccountsQuery, sessionQuery } from "@/hooks/use-account";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { hasDeliverableEmail } from "@/lib/universal/auth";
import { useSuspenseQueries } from "@tanstack/react-query";
import { AccountRow, AccountSection } from "./account-section";
import UpdateEmail from "./update-email";
import UpdatePassword from "./update-password";
import UpdateSocial from "./update-social";
import UpdateUsername from "./update-username";
import { EmailStatusBadge, SendVerificationEmail } from "./verify-email";

export default function ProfileSection() {
  const [{ data: accounts }, { data: user }] = useSuspenseQueries({
    queries: [listAccountsQuery, sessionQuery],
  });

  if (!user) {
    return null;
  }

  const hasCredentialAccount =
    accounts.findIndex((account) => account.providerId === "credential") !== -1;
  // a Twitter username stored in place of an email can't be verified
  const canVerify = hasDeliverableEmail(user.email);

  return (
    <AccountSection
      id="profile"
      title={m.account_section_profile()}
      description={m.account_section_profile_description({
        appName: env.VITE_APP_NAME,
      })}
    >
      <AccountRow
        label={m.common_username()}
        description={m.account_username_rules()}
      >
        <UpdateUsername username={user.displayUsername ?? ""} />
      </AccountRow>

      <AccountRow
        label={
          <span className="flex flex-col items-start gap-1.5">
            {m.account_profile_email()}
            {canVerify && <EmailStatusBadge verified={user.emailVerified} />}
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          <UpdateEmail email={user.email} />
          {canVerify && !user.emailVerified && (
            <SendVerificationEmail email={user.email} />
          )}
        </div>
      </AccountRow>

      <AccountRow
        label={m.common_password()}
        description={
          hasCredentialAccount ? m.account_password_rules() : undefined
        }
      >
        {hasCredentialAccount ? (
          <UpdatePassword />
        ) : (
          <p className="text-sm text-muted-foreground">
            {m.account_profile_no_password()}{" "}
            <span className="font-semibold text-foreground">
              {m.account_profile_forgot_password()}
            </span>{" "}
            {m.account_profile_set_password()}
          </p>
        )}
      </AccountRow>

      <div className="px-4 py-5 sm:px-6">
        <UpdateSocial showSocials={user.showSocials ?? false} />
      </div>
    </AccountSection>
  );
}
