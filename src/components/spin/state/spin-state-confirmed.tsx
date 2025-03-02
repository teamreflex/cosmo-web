import {
  SpinStateConfirmReceipt,
  useSpinComplete,
} from "@/hooks/use-objekt-spin";
import { useState } from "react";

type Props = {
  state: SpinStateConfirmReceipt;
};

/**
 * Cosmo has confirmed the objekt transfer, show the 16 options.
 */
export default function StateConfirmed({ state }: Props) {
  const { mutate, status } = useSpinComplete();
  const [index, setIndex] = useState<number>();

  function handleSelection(selection?: number) {
    setIndex(selection ?? Math.floor(Math.random() * 16));
  }

  function handleConfirm() {
    if (!index) return;
    mutate({
      spinId: state.spinId,
      index,
    });
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <div>confirmed with cosmo!</div>

      <button
        onClick={handleConfirm}
        disabled={status === "pending" || index === undefined}
      >
        confirm selection
      </button>

      <button onClick={() => handleSelection()} disabled={status === "pending"}>
        select a random option!
      </button>

      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, index) => (
          <button
            key={index}
            onClick={() => handleSelection(index)}
            disabled={status === "pending"}
          >
            {index}
          </button>
        ))}
      </div>
    </div>
  );
}
