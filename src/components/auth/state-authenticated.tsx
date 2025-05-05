"use client";

import { useTransition } from "react";
import UserDropdown from "./user-dropdown";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/client/auth";
import { PublicUser } from "@/lib/universal/auth";

type Props = {
  user: PublicUser;
};

export default function StateAuthenticated({ user }: Props) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.refresh();
    });
  }

  if (isPending) {
    return <Loader2 className="animate-spin" />;
  }

  return <UserDropdown key={pathname} user={user} onSignOut={signOut} />;
}
