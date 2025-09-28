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
        <AccordionTrigger>Username</AccordionTrigger>
        <AccordionContent>
          <UpdateUsername username={user.displayUsername ?? ""} />
        </AccordionContent>
      </AccordionItem>

      {/* email */}
      <AccordionItem value="email">
        <AccordionTrigger>Email Address</AccordionTrigger>
        <AccordionContent>
          <UpdateEmail email={user.email} />
        </AccordionContent>
      </AccordionItem>

      {/* password */}
      <AccordionItem value="password">
        <AccordionTrigger>Password</AccordionTrigger>
        <AccordionContent>
          {hasCredentialAccount ? (
            <UpdatePassword />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <p className="text-sm">
                You do not have a password currently set. Please use the{" "}
                <span className="font-semibold">forgot password</span>{" "}
                functionality to set one.
              </p>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* social */}
      <AccordionItem value="social">
        <AccordionTrigger>Social</AccordionTrigger>
        <AccordionContent>
          <UpdateSocial showSocials={user.showSocials ?? false} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
