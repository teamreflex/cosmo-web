import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import {
  itemLabel,
  pinnedLabel,
  substituteSourceName,
  tradeTimeFormat,
  txUrl,
} from "@/lib/client/trades";
import { $acceptSubstitute } from "@/lib/functions/trades";
import { substituteCandidatesQuery } from "@/lib/queries/trades";
import { isExpectedError } from "@/lib/universal/errors/expected";
import type { TradeItemView } from "@/lib/universal/trades";
import { formatSerial } from "@apollo/util";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useId, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";
import { bold } from "../notifications/row-utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";
import ObjektThumbnail from "./objekt-thumbnail";

type Props = {
  tradeId: string;
  listingId: string | null;
  item: TradeItemView;
  // the objekt's sender as the page names them
  name: string;
  // whether accepting a copy settles the last thing the trade owes
  completes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The receiver of an objekt picks another copy of its collection that
 * reached them since the trade was accepted, from any account, and accepts
 * it in place of the pinned serial, newest first and preselected. Only the
 * list of copies suspends; the footer follows the same read through the
 * query cache, so its button names the picked copy once it loads. It can't
 * be undone, so the dialog waits on the answer, and the page refetches
 * either way.
 */
export default function AcceptSubstituteDialog({
  tradeId,
  listingId,
  item,
  name,
  completes,
  open,
  onOpenChange,
}: Props) {
  // the read SubstituteCopies suspends on, observed here without suspending
  const { data: candidates } = useQuery({
    ...substituteCandidatesQuery(tradeId, item.id),
    enabled: open,
  });
  const [picked, setPicked] = useState<number | null>(null);
  // the newest copy is picked until the receiver picks another
  const pick =
    candidates?.find(({ tokenId }) => tokenId === picked) ?? candidates?.[0];
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => {
      // the accept button stays disabled until a copy is picked
      if (pick === undefined) throw new Error("no copy picked");
      return $acceptSubstitute({
        data: {
          tradeId,
          itemId: item.id,
          tokenId: pick.tokenId,
          hash: pick.hash,
        },
      });
    },
    onSuccess: () => {
      toast.success(m.trade_page_substitute_toast());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.trade_page_substitute_title()}
      description={m.trade_page_substitute_description({
        name,
        objekt: itemLabel(item),
        pinned: pinnedLabel(item),
      })}
      confirmLabel={
        pick === undefined || pick.serial === null
          ? m.trade_page_substitute_accept_copy()
          : m.trade_page_substitute_accept({
              serial: formatSerial(pick.serial),
            })
      }
      variant="cosmo"
      buttonClassName="max-sm:h-11"
      disabled={pick === undefined}
      mutation={mutation}
    >
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ error, resetErrorBoundary }) => (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {isExpectedError(error)
                    ? formatError(error)
                    : m.error_unknown()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetErrorBoundary}
                >
                  <IconRefresh /> {m.common_retry()}
                </Button>
              </div>
            )}
          >
            <Suspense
              fallback={
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              }
            >
              <SubstituteCopies
                tradeId={tradeId}
                item={item}
                name={name}
                completes={completes}
                picked={pick?.tokenId ?? null}
                onPick={setPicked}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </ConfirmActionDialog>
  );
}

/**
 * The copies the receiver can pick from, each with its serial, who sent it
 * and when, and what accepting one does, or an empty state while none has
 * been drained. It suspends until the copies load.
 */
function SubstituteCopies({
  tradeId,
  item,
  name,
  completes,
  picked,
  onPick,
}: Pick<Props, "tradeId" | "item" | "name" | "completes"> & {
  picked: number | null;
  onPick: (tokenId: number | null) => void;
}) {
  const labelId = useId();
  const { data: candidates } = useSuspenseQuery(
    substituteCandidatesQuery(tradeId, item.id),
  );
  const pinned = pinnedLabel(item);

  if (candidates.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
        {m.trade_page_substitute_empty({ objekt: itemLabel(item) })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <span id={labelId} className="text-sm font-medium">
          {m.trade_page_substitute_legend()}
        </span>
        <RadioGroup
          aria-labelledby={labelId}
          value={picked}
          onValueChange={onPick}
          className="gap-2"
        >
          {candidates.map((copy) => (
            <Label
              key={`${copy.tokenId}-${copy.hash}`}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 font-normal has-data-checked:border-cosmo/60 has-data-checked:bg-cosmo/10"
            >
              <RadioGroupItem value={copy.tokenId} />
              <ObjektThumbnail collection={item.collection} className="w-6" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-mono text-sm font-medium tabular-nums">
                  {copy.serial === null
                    ? itemLabel(item)
                    : formatSerial(copy.serial)}
                </span>
                <span className="text-xs text-muted-foreground">
                  <ParaglideMessage
                    message={m.trade_page_substitute_from}
                    inputs={{ name: substituteSourceName(copy.from, name) }}
                    markup={bold}
                  />
                  {" · "}
                  <span className="whitespace-nowrap">
                    <Timestamp date={copy.at} format={tradeTimeFormat} />
                  </span>
                </span>
              </span>
              <a
                href={txUrl(copy.hash)}
                target="_blank"
                rel="noopener"
                aria-label={m.trade_page_view_transfer()}
                title={m.trade_page_view_transfer()}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <IconExternalLink className="size-4" />
              </a>
            </Label>
          ))}
        </RadioGroup>
      </div>
      <ul className="flex flex-col gap-2 text-sm text-foreground/80">
        <li className="flex gap-2.5">
          <IconCheck
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400"
          />
          {m.trade_page_substitute_counts({ name, pinned })}
        </li>
        {completes && (
          <li className="flex gap-2.5">
            <IconCheck
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400"
            />
            {m.trade_page_substitute_completes()}
          </li>
        )}
        <li className="flex gap-2.5">
          <IconAlertCircle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          />
          {m.trade_page_substitute_final({ pinned })}
        </li>
      </ul>
    </div>
  );
}
