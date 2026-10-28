import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { transferGrid } from "./transfer-columns";

export default function TransferHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        transferGrid,
        "sticky top-14 z-20 hidden border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
      )}
    >
      <span>{m.transfer_when_header()}</span>
      <span className="flex items-center gap-1">
        <IconArrowUpRight className="size-3" />
        {m.transfer_out_header()}
      </span>
      <span />
      <span className="flex items-center gap-1">
        <IconArrowDownLeft className="size-3" />
        {m.transfer_in_header()}
      </span>
      <span>{m.transfer_outcome_header()}</span>
      <span>{m.transfer_with_header()}</span>
      <span />
    </div>
  );
}
