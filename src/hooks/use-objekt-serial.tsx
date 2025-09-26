import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

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
        | ((prev: number | undefined) => number | undefined)
    ) => {
      if (typeof serial === "function") {
        serial = serial(search.serial ?? undefined);
      }

      navigate({
        // @ts-ignore - TODO: fix
        search: (prev) => ({ ...prev, serial }),
      });
    },
    [navigate, search]
  );

  const reset = useCallback(() => {
    setSerial(undefined);
  }, [setSerial]);

  return { serial: search.serial ?? undefined, setSerial, reset };
}
