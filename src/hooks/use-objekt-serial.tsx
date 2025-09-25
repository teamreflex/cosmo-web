import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

export function useObjektSerial() {
  const navigate = useNavigate();
  const search = useSearch({
    strict: false,
  });

  const setSerial = useCallback(
    (serial: number | null | ((prev: number | null) => number | null)) => {
      if (typeof serial === "function") {
        serial = serial(search.serial ?? null);
      }

      navigate({
        // @ts-ignore - TODO: fix
        search: (prev) => ({ ...prev, serial }),
      });
    },
    [navigate, search]
  );

  const reset = useCallback(() => {
    setSerial(null);
  }, [setSerial]);

  return { serial: search.serial ?? null, setSerial, reset };
}
