import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";

const route = getRouteApi("/");

/**
 * Manages the objekt slug when opening the metadata dialog.
 */
export function useActiveObjekt() {
  const navigate = route.useNavigate();
  const search = route.useSearch();

  const setActiveObjekt = useCallback(
    (slug: string | undefined) => {
      navigate({
        search: (prev) => ({ ...prev, id: slug }),
        replace: true,
      });
    },
    [navigate, search],
  );

  const reset = useCallback(() => {
    setActiveObjekt(undefined);
  }, [setActiveObjekt]);

  return { activeObjekt: search.id ?? undefined, setActiveObjekt, reset };
}
