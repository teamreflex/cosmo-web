import type { OfferPicks } from "@/components/trades/offer-picks";
import { offerTokenRefusal } from "@/lib/client/errors/trades";
import { formatOfferError } from "@/lib/client/trades";
import { tradesKey } from "@/lib/queries/trades";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";

/**
 * Sends a direct offer or a counter at most once at a time, however fast
 * its button is pressed, then opens the trade it created, or says why it
 * was refused, naming the copy in `picks` when the server could tell which.
 * A refusal refetches every trade query, so a trade that moved on shows
 * where it stands and the picker's copies are current, and hands the named
 * copy to `onRefusedToken` to take out of the picks.
 */
export function useSendOffer<TData>({
  mutationFn,
  picks,
  sent,
  onSent,
  onRefusedToken,
}: {
  mutationFn: (options: { data: TData }) => Promise<{ tradeId: string }>;
  picks: OfferPicks | null;
  /** the toast once it's sent */
  sent: () => string;
  onSent?: () => void;
  onRefusedToken: (tokenId: number) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // a second press before the first re-renders the button disabled sends nothing
  const sending = useRef(false);
  const mutation = useMutation({
    mutationFn,
    onSuccess: async ({ tradeId }) => {
      toast.success(sent());
      onSent?.();
      // marked stale only, so the picker's queries don't refetch as it leaves
      void queryClient.invalidateQueries({
        queryKey: tradesKey,
        refetchType: "none",
      });
      await navigate({ to: "/trade/$id", params: { id: tradeId } });
    },
    onError: (error) => {
      toast.error(
        formatOfferError(error, [
          ...(picks?.give.values() ?? []),
          ...(picks?.get.values() ?? []),
        ]),
      );
      const refusal = offerTokenRefusal(error);
      if (refusal !== null) onRefusedToken(refusal.tokenId);
      void queryClient.invalidateQueries({ queryKey: tradesKey });
    },
    onSettled: () => {
      sending.current = false;
    },
  });
  return {
    isPending: mutation.isPending,
    send: (data: TData) => {
      if (sending.current) return;
      sending.current = true;
      mutation.mutate({ data });
    },
  };
}
