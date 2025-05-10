import { useListAccounts, useSessionUser } from "@/hooks/use-account";
import UpdateUsername from "./update-username";
import UpdateEmail from "./update-email";
import UpdatePassword from "./update-password";

export default function Profile() {
  const { data: accounts } = useListAccounts();
  const { data: user } = useSessionUser();

  const hasCredentialAccount =
    accounts.findIndex((account) => account.provider === "credential") !== -1;

  return (
    <div className="flex flex-col gap-2">
      <UpdateUsername username={user?.displayUsername ?? ""} />
      <UpdateEmail email={user.email} />
      {hasCredentialAccount ? (
        <UpdatePassword />
      ) : (
        <div className="flex flex-col justify-center items-center">
          <p className="text-sm">
            You do not have a password currently set. Please use the{" "}
            <span className="font-semibold">forgot password</span> functionality
            to set one.
          </p>
        </div>
      )}
    </div>
  );
}
