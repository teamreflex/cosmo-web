import { Button } from "@/components/ui/button";
import { SpinStateConfirmError, useSpinConfirm } from "@/hooks/use-objekt-spin";
import { AlertTriangle, Satellite } from "lucide-react";

type Props = {
  state: SpinStateConfirmError;
};

/**
 * Confirming with COSMO failed, allow a retry.
 */
export default function StateConfirmError({ state }: Props) {
  const { mutate, isPending } = useSpinConfirm();

  if (isPending) {
    return (
      <div className="flex flex-col items-center">
        <Satellite className="h-24 w-24 animate-pulse" />
        <p className="text-sm font-semibold">Confirming with COSMO...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <AlertTriangle className="h-24 w-24" />
      <p className="text-sm font-semibold">Confirming with COSMO failed.</p>
      <Button onClick={() => mutate(state.spinId)}>Retry</Button>
    </div>
  );
}
