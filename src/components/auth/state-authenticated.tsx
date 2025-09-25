import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useRouter } from "@tanstack/react-router";
import UserDropdown from "./user-dropdown";
import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { authClient } from "@/lib/client/auth";

type Props = {
  user: PublicUser;
  cosmo?: PublicCosmo;
};

export default function StateAuthenticated({ user, cosmo }: Props) {
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.invalidate();
          },
        },
      });
    });
  }

  if (isPending) {
    return <Loader2 className="animate-spin" />;
  }

  return (
    <UserDropdown
      key={location.pathname}
      onSignOut={signOut}
      user={user}
      cosmo={cosmo}
    />
  );
}
