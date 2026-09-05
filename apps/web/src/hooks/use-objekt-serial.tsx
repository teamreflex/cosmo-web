import { useNavigate, useSearch } from "@tanstack/react-router";

function resolveSerial(
  next: number | undefined | ((prev: number | undefined) => number | undefined),
  prev: number | undefined,
) {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the updater-function union, standard setState pattern
  return typeof next === "function" ? next(prev) : next;
}

/**
 * Manages the objekt serial from within the metadata dialog.
 */
export function useObjektSerial() {
  const navigate = useNavigate();
  const searchSerial = useSearch({
    strict: false,
    select: (search) => search.serial ?? undefined,
  });

  /**
   * Resolves updater functions against the URL's current serial rather than
   * the rendered one, so the setter stays referentially stable.
   */
  const setSerial = (
    serial:
      | number
      | undefined
      | ((prev: number | undefined) => number | undefined),
  ) => {
    void navigate({
      // @ts-ignore - this hook is used on different routes so we can't reliably type this
      search: (prev) => ({
        ...prev,
        serial: resolveSerial(serial, prev.serial ?? undefined),
      }),
      resetScroll: false,
      replace: true,
    });
  };

  function reset() {
    setSerial(undefined);
  }

  return { serial: searchSerial, setSerial, reset };
}
