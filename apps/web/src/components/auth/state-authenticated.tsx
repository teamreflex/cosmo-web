import { authClient } from "@/lib/client/auth";
import type { CurrentUser } from "@/lib/universal/auth";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import UserDropdown from "./user-dropdown";

type Props = {
  user: CurrentUser;
};

export default function StateAuthenticated({ user }: Props) {
  const mutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      /**
       * A full page load, so nothing the signed-in viewer loaded carries
       * over to whoever signs in next in this tab: queries, the router's
       * cache and the chat's loaded conversations alike.
       */
      window.location.assign("/");
    },
  });

  if (mutation.isPending) {
    return <IconLoader2 className="animate-spin" />;
  }

  return <UserDropdown onSignOut={mutation.mutate} user={user} />;
}
