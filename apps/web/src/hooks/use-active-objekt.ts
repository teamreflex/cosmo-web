import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/");

/**
 * Manages the objekt slug when opening the metadata dialog.
 */
export function useActiveObjekt() {
  const navigate = route.useNavigate();
  const id = route.useSearch({
    select: (search) => search.id ?? undefined,
  });

  const setActiveObjekt = (slug: string | undefined) => {
    void navigate({
      search: (prev) => ({ ...prev, id: slug }),
      replace: true,
      resetScroll: false,
    });
  };

  const reset = () => {
    setActiveObjekt(undefined);
  };

  return { activeObjekt: id, setActiveObjekt, reset };
}
