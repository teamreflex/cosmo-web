import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Manages the objekt serial from within the metadata dialog.
 */
export function useObjektSerial() {
  const navigate = useNavigate();
  const searchSerial = useSearch({
    strict: false,
    select: (search) => search.serial ?? undefined,
  });

  const setSerial = (
    serial:
      | number
      | undefined
      | ((prev: number | undefined) => number | undefined),
  ) => {
    if (typeof serial === "function") {
      serial = serial(searchSerial);
    }

    void navigate({
      // @ts-ignore - this hook is used on different routes so we can't reliably type this
      search: (prev) => ({ ...prev, serial }),
      resetScroll: false,
      replace: true,
    });
  };

  function reset() {
    setSerial(undefined);
  }

  return { serial: searchSerial, setSerial, reset };
}
