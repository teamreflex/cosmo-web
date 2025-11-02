import { useShallow } from "zustand/react/shallow";
import { useProfileContext } from "./use-profile";
import { useUserState } from "./use-user-state";

/**
 * Optimized hook for checking if the target is the same as the account.
 */
export function useAuthenticated() {
  const { cosmo } = useUserState();
  const target = useProfileContext(
    useShallow((state) => state.target?.cosmo?.address),
  );

  return (
    target !== undefined && cosmo !== undefined && target === cosmo.address
  );
}
