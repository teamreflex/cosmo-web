import { SpinStateSent } from "@/hooks/use-objekt-spin";
import { Satellite } from "lucide-react";

type Props = {
  state: SpinStateSent;
};

/**
 * Transaction has been confirmed, now confirming with COSMO.
 */
export default function StateSuccess({ state }: Props) {
  return (
    <div className="flex flex-col items-center">
      <Satellite className="h-24 w-24 animate-pulse" />
      <p className="text-sm font-semibold">Confirming with COSMO...</p>
    </div>
  );
}
