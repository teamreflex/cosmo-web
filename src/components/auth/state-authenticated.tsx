"use client";

import { useTransition } from "react";
import UserDropdown from "./user-dropdown";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/client/auth";
import { User } from "@/lib/universal/auth";

type Props = {
  user: User;
};

export default function StateAuthenticated({ user }: Props) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
    });
  }

  if (isPending) {
    return <Loader2 className="animate-spin" />;
  }

  return <UserDropdown key={pathname} user={user} onSignOut={signOut} />;
}
