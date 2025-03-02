import { SpinStateSending } from "@/hooks/use-objekt-spin";
import { Satellite } from "lucide-react";

type Props = {
  state: SpinStateSending;
};

/**
 * Objekt has been sent, waiting for transaction to be confirmed.
 */
export default function StatePending({ state }: Props) {
  return (
    <div className="flex flex-col items-center">
      <Satellite className="h-24 w-24 animate-pulse" />
      <p className="text-sm font-semibold">Sending objekt to COSMO...</p>
    </div>
  );
}
