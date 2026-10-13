import { authClient } from "@/lib/client/auth";
import { currentAccountQuery, removeViewerQueries } from "@/lib/queries/core";
import type { CurrentUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import UserDropdown from "./user-dropdown";

type Props = {
  user: CurrentUser;
  cosmo?: PublicCosmo;
};

export default function StateAuthenticated({ user, cosmo }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      queryClient.setQueryData(currentAccountQuery.queryKey, null);
      await router.navigate({ to: "/" });
      // after navigating, so no mounted staff page refetches what's removed
      removeViewerQueries(queryClient);
      // so Back to a signed-in page runs its loader rather than showing it
      router.clearCache();
      await router.invalidate();
    },
  });

  if (mutation.isPending) {
    return <IconLoader2 className="animate-spin" />;
  }

  return <UserDropdown onSignOut={mutation.mutate} user={user} cosmo={cosmo} />;
}
