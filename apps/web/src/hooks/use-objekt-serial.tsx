import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * Manages the objekt serial from within the metadata dialog.
 */
export function useObjektSerial() {
  const navigate = useNavigate();
  const search = useSearch({
    strict: false,
  });

  const setSerial = useCallback(
    (
      serial:
        | number
        | undefined
        | ((prev: number | undefined) => number | undefined),
    ) => {
      if (typeof serial === "function") {
        serial = serial(search.serial ?? undefined);
      }

      navigate({
        // @ts-ignore - this hook is used on different routes so we can't reliably type this
        search: (prev) => ({ ...prev, serial }),
        replace: true,
      });
    },
    [navigate, search],
  );

  const reset = useCallback(() => {
    setSerial(undefined);
  }, [setSerial]);

  return { serial: search.serial ?? undefined, setSerial, reset };
}
