"use client";

import { useTransition } from "react";
import UserDropdown from "./user-dropdown";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/client/auth";
import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";

type Props = {
  user: PublicUser;
  cosmo?: PublicCosmo;
};

export default function StateAuthenticated({ user, cosmo }: Props) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.refresh();
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
      key={pathname}
      onSignOut={signOut}
      user={user}
      cosmo={cosmo}
    />
  );
}
