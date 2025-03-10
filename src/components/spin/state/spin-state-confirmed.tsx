import { Button } from "@/components/ui/button";
import {
  SpinStateConfirmReceipt,
  SpinStateResuming,
  useObjektSpin,
  useSpinComplete,
  useSpinTickets,
} from "@/hooks/use-objekt-spin";
import { Check, Dices } from "lucide-react";
import { useState } from "react";
import SpinCard from "@/assets/spin-card.png";
import Image from "next/image";
import { cn, track } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useProfileContext } from "@/hooks/use-profile";

type Props = {
  state: SpinStateConfirmReceipt | SpinStateResuming;
};

/**
 * Cosmo has confirmed the objekt transfer, show the 16 options.
 */
export default function StateConfirmed({ state }: Props) {
  const queryClient = useQueryClient();
  const { refetch } = useSpinTickets();
  const { mutate, status } = useSpinComplete();
  const completeSpin = useObjektSpin((state) => state.completeSpin);
  const profile = useProfileContext((ctx) => ctx.currentProfile);
  const [index, setIndex] = useState<number>();

  function handleSelection(selection?: number) {
    setIndex(selection ?? Math.floor(Math.random() * 16));
  }

  function handleConfirm() {
    if (index === undefined) return;

    mutate(
      {
        spinId: state.spinId,
        index,
      },
      {
        onSuccess: (options, { index }) => {
          track("spin-objekt");
          // update spin state to completed
          completeSpin(index, options);
          // refetch spin tickets
          refetch();
          // clear collection cache
          queryClient.invalidateQueries({
            predicate: (query) => {
              return (
                query.queryKey[0] === "collection" &&
                query.queryKey.includes(profile!.address)
              );
            },
          });
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleConfirm}
          disabled={status === "pending" || index === undefined}
        >
          <Check className="w-4 h-4 mr-2" />
          <span>Confirm Selection</span>
        </Button>

        <Button
          onClick={() => handleSelection()}
          disabled={status === "pending"}
        >
          <Dices className="w-4 h-4 mr-2" />
          <span>Random</span>
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 w-full lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleSelection(i)}
            disabled={status === "pending"}
            className={cn(
              "aspect-photocard w-full rounded-lg overflow-hidden border-2 border-transparent transition-colors",
              i === index && "border-foreground"
            )}
          >
            <Image
              src={SpinCard.src}
              alt="Spin Card"
              width={100}
              height={100}
              className="w-full h-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
