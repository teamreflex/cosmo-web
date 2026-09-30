import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Manages the objekt slug when opening the metadata dialog.
 */
export function useActiveObjekt() {
  const navigate = useNavigate({ from: "/" });
  const id = useSearch({
    from: "/",
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
