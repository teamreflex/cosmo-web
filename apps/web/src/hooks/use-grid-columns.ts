import { useShallow } from "zustand/react/shallow";
import { GRID_COLUMNS } from "@apollo/util";
import { useMediaQuery } from "./use-media-query";
import { useProfileContext } from "./use-profile";
import { useUserState } from "./use-user-state";

/**
 * Optimized hook for getting the grid columns.
 */
export function useGridColumns() {
  const isDesktop = useMediaQuery();
  const { user, cosmo } = useUserState();
  const target = useProfileContext(useShallow((state) => state.target));

  // workaround for zustand stores not getting updated on router.refresh()
  const isCurrent =
    user !== undefined && target?.cosmo?.address === cosmo?.address;

  return isDesktop
    ? isCurrent
      ? user.gridColumns
      : (target?.user?.gridColumns ?? user?.gridColumns ?? GRID_COLUMNS)
    : 3;
}
