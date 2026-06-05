import { m } from "@/i18n/messages";
import { noticeQuery } from "@/lib/queries/notice";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export default function Notice() {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <NoticePopover />
      </Suspense>
    </ErrorBoundary>
  );
}

function NoticePopover() {
  const { data } = useSuspenseQuery(noticeQuery);
  if (!data) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-7 w-8 shrink-0 items-center justify-center rounded-sm border border-orange-500/30 bg-orange-500/30 shadow-sm transition-colors hover:bg-orange-500/45 lg:h-8 lg:w-9"
          aria-label={m.aria_platform_notice()}
        >
          <IconAlertTriangle className="h-5 w-5 text-orange-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-xs">
        <p className="whitespace-pre-wrap">{data}</p>
      </PopoverContent>
    </Popover>
  );
}
