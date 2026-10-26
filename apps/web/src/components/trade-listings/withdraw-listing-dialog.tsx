import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $withdrawListing } from "@/lib/functions/trade-listings";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Spinner } from "../ui/spinner";

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
  const invalidate = useInvalidateListing(listingId);
  const mutation = useMutation({
    mutationFn: () => $withdrawListing({ data: { listingId } }),
    onSuccess: () => {
      toast.success(m.listing_detail_withdrawn());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidate,
  });

  return (
    <AlertDialog
      open={open}
      // the withdraw can't be called back, so the dialog waits for its answer
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.listing_detail_withdraw_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.listing_detail_withdraw_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {m.common_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={(event) => {
              event.preventBaseUIHandler();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {m.listing_detail_withdraw_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
