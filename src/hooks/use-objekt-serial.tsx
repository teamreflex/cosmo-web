import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs";

export function useObjektSerial() {
  const [serial, setSerial] = useQueryState("serial", parseAsInteger);

  function reset() {
    setSerial(null);
  }

  return { serial, setSerial, reset };
}
