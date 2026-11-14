import { GRID_COLUMNS } from "@apollo/util";
import { useMatch } from "@tanstack/react-router";
import { useMediaQuery } from "./use-media-query";
import { useUserState } from "./use-user-state";

/**
 * Columns an objekt grid has below the `md` breakpoint, whatever the user's setting.
 */
export const MOBILE_GRID_COLUMNS = 3;

/**
 * Columns an objekt grid has: the setting of the profile's owner on a
 * profile, and the viewer's own everywhere else.
 */
export function useGridColumns() {
  const isDesktop = useMediaQuery();
  const { user, cosmo } = useUserState();
  // grids render off a profile too, where there is no target
  const target = useMatch({
    from: "/@{$username}",
    shouldThrow: false,
    select: (match) => match.loaderData?.target,
  });

  // the target account is never refetched, so the viewer's own profile follows their account
  const isCurrent =
    user !== undefined && target?.cosmo.address === cosmo?.address;

  return isDesktop
    ? isCurrent
      ? user.gridColumns
      : (target?.user?.gridColumns ?? user?.gridColumns ?? GRID_COLUMNS)
    : MOBILE_GRID_COLUMNS;
}
