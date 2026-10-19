import { $listSerialConfirmations } from "@/lib/functions/serials";
import { queryOptions } from "@tanstack/react-query";

export const serialConfirmationsQuery = queryOptions({
  queryKey: ["admin", "serial-confirmations"],
  queryFn: ({ signal }) => $listSerialConfirmations({ signal }),
});
