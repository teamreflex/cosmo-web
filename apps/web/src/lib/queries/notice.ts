import { $getNotice } from "@/lib/functions/notice";
import { queryOptions } from "@tanstack/react-query";

export const noticeQuery = queryOptions({
  queryKey: ["notice"],
  queryFn: ({ signal }) => $getNotice({ signal }),
  staleTime: 5 * 60 * 1000,
});
