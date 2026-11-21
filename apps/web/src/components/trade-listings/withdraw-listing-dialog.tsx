import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $withdrawListing } from "@/lib/functions/trade-listings";
import { track } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";

type Props = {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Confirms withdrawing the poster's open listing. It stays open until the
 * withdraw lands, then the page refetches into its closed state.
 */
export default function WithdrawListingDialog({
  listingId,
  open,
  onOpenChange,
}: Props) {
  const invalidate = useInvalidateListing();
  const mutation = useMutation({
    mutationFn: () => $withdrawListing({ data: { listingId } }),
    onSuccess: () => {
      track("withdraw-listing");
      toast.success(m.listing_detail_withdrawn());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidate,
  });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.listing_detail_withdraw_title()}
      description={m.listing_detail_withdraw_description()}
      confirmLabel={m.listing_detail_withdraw_confirm()}
      variant="destructive"
      mutation={mutation}
    />
  );
}
