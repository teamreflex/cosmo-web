import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { m } from "@/i18n/messages";
import type { EditionLedger } from "@/lib/universal/grid";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: string;
  season: string;
  edition: EditionLedger;
  includedTokenIds: ReadonlySet<string>;
  onToggleToken: (tokenId: string) => void;
};

/**
 * Toggles non-transferable copies into the edition's usable counts. The
 * selection is view-local and resets on reload.
 */
export default function IncludeTokensDialog(props: Props) {
  const pools = props.edition.numbers.filter(
    (pool) => pool.nonTransferable.length > 0,
  );

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {m.grid_include_dialog_title()} — {props.season} {props.member}
          </DialogTitle>
          <DialogDescription>
            {m.grid_include_dialog_description()}
          </DialogDescription>
        </DialogHeader>

        {pools.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {m.grid_include_empty()}
          </p>
        ) : (
          <ScrollArea className="-mx-6 max-h-72">
            <ul className="flex flex-col">
              {pools.map((pool) => (
                <li
                  key={pool.collectionNo}
                  className="flex flex-col border-b border-border last:border-b-0"
                >
                  {pool.nonTransferable.map((token) => (
                    <TokenRow
                      key={token.tokenId}
                      collectionNo={token.collectionNo}
                      serial={token.serial}
                      isChecked={props.includedTokenIds.has(token.tokenId)}
                      onToggle={() => props.onToggleToken(token.tokenId)}
                    />
                  ))}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TokenRow(props: {
  collectionNo: string;
  serial: number;
  isChecked: boolean;
  onToggle: () => void;
}) {
  const paddedSerial = props.serial.toString().padStart(5, "0");

  return (
    <button
      type="button"
      onClick={props.onToggle}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:gap-4 sm:px-5"
    >
      <div className="w-20 shrink-0 font-mono text-sm font-bold tabular-nums sm:w-24 sm:text-lg">
        {props.collectionNo}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.detail_sort_serial()}
        </div>
        <div className="font-mono text-sm font-bold tabular-nums">
          #{paddedSerial}
        </div>
      </div>

      <div
        aria-hidden
        data-checked={props.isChecked}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-lg border border-input transition-colors",
          "data-[checked=true]:border-primary data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground",
        )}
      >
        {props.isChecked && <IconCheck className="size-3.5" />}
      </div>
    </button>
  );
}
