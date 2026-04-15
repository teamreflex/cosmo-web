import { authClient } from "@/lib/client/auth";
import { currentAccountQuery } from "@/lib/queries/core";
import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import NotificationBell from "../notifications/notification-bell";
import UserDropdown from "./user-dropdown";

type Props = {
  user: PublicUser;
  cosmo?: PublicCosmo;
};

export default function StateAuthenticated({ user, cosmo }: Props) {
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      queryClient.setQueryData(currentAccountQuery.queryKey, null);
      await router.navigate({ to: "/" });
      await router.invalidate();
    },
  });

  if (mutation.isPending) {
    return <IconLoader2 className="animate-spin" />;
  }

  return (
    <div className="contents">
      <div className="hidden sm:flex">
        <NotificationBell key={location.pathname} />
      </div>

      <UserDropdown
        key={location.pathname}
        onSignOut={mutation.mutate}
        user={user}
        cosmo={cosmo}
      />
    </div>
  );
}
