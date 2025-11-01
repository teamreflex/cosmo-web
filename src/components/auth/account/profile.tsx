import UpdateUsername from "./update-username";
import UpdateEmail from "./update-email";
import UpdatePassword from "./update-password";
import UpdateSocial from "./update-social";
import { useListAccounts, useSessionUser } from "@/hooks/use-account";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { m } from "@/i18n/messages";

export default function Profile() {
  const { data: accounts } = useListAccounts();
  const { data: user } = useSessionUser();

  if (!user) {
    return null;
  }

  const hasCredentialAccount =
    accounts.findIndex((account) => account.providerId === "credential") !== -1;

  return (
    <Accordion type="single" collapsible>
      {/* username */}
      <AccordionItem value="username">
        <AccordionTrigger>{m.common_username()}</AccordionTrigger>
        <AccordionContent>
          <UpdateUsername username={user.displayUsername ?? ""} />
        </AccordionContent>
      </AccordionItem>

      {/* email */}
      <AccordionItem value="email">
        <AccordionTrigger>{m.account_profile_email()}</AccordionTrigger>
        <AccordionContent>
          <UpdateEmail email={user.email} />
        </AccordionContent>
      </AccordionItem>

      {/* password */}
      <AccordionItem value="password">
        <AccordionTrigger>{m.common_password()}</AccordionTrigger>
        <AccordionContent>
          {hasCredentialAccount ? (
            <UpdatePassword />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <p className="text-sm">
                {m.account_profile_no_password()}{" "}
                <span className="font-semibold">{m.account_profile_forgot_password()}</span>{" "}
                {m.account_profile_set_password()}
              </p>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* social */}
      <AccordionItem value="social">
        <AccordionTrigger>{m.account_profile_social()}</AccordionTrigger>
        <AccordionContent>
          <UpdateSocial showSocials={user.showSocials ?? false} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
