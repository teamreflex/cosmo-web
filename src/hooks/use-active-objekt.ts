import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";

const route = getRouteApi("/");

export function useActiveObjekt() {
  const navigate = route.useNavigate();
  const search = route.useSearch();

  const setActiveObjekt = useCallback(
    (
      slug:
        | string
        | undefined
        | ((prev: string | undefined) => string | undefined)
    ) => {
      navigate({
        // @ts-ignore - TODO: fix
        search: (prev) => ({ ...prev, id: slug }),
      });
    },
    [navigate, search]
  );

  const reset = useCallback(() => {
    setActiveObjekt(undefined);
  }, [setActiveObjekt]);

  return { activeObjekt: search.id ?? undefined, setActiveObjekt, reset };
}
