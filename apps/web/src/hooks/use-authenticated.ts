import { useProfileTarget } from "./use-profile";
import { useUserState } from "./use-user-state";

/**
 * Whether the profile on screen is the viewer's own.
 */
export function useAuthenticated() {
  const { cosmo } = useUserState();
  const address = useProfileTarget((target) => target.cosmo.address);

  return cosmo !== undefined && address === cosmo.address;
}
