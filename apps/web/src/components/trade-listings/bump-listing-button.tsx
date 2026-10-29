import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { timeLeft } from "@/lib/client/time";
import { $bumpListing } from "@/lib/functions/trade-listings";
import { BUMP_COOLDOWN } from "@apollo/trades/timers";
import { IconArrowBigUpLines } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ticker } from "../misc/countdown";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

type Props = {
  listingId: string;
  bumpedAt: Date;
  className: string | undefined;
};

/**
 * Bumps the poster's open listing to the top of the feed. Until
 * BUMP_COOLDOWN has passed since it was posted or last bumped, it's
 * disabled and counts down; the server and the hydration pass render it
 * disabled, since their clocks differ from the browser's.
 */
export default function BumpListingButton({
  listingId,
  bumpedAt,
  className,
}: Props) {
  const invalidate = useInvalidateListing();
  const mutation = useMutation({
    mutationFn: () => $bumpListing({ data: { listingId } }),
    onSuccess: () => toast.success(m.listing_detail_bumped()),
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidate,
  });
  const next = new Date(bumpedAt.getTime() + BUMP_COOLDOWN);

  const button = (now: Date | null) => {
    const waiting = now !== null && now < next;
    return (
      <Button
        variant="outline"
        className={className}
        disabled={now === null || waiting || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Spinner /> : <IconArrowBigUpLines />}
        {waiting
          ? m.listing_detail_bump_in({
              time: m.common_hours_minutes(timeLeft(now, next)),
            })
          : m.listing_detail_bump()}
      </Button>
    );
  };

  return <Ticker fallback={button(null)}>{button}</Ticker>;
}
