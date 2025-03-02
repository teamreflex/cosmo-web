import { SpinStateSending } from "@/hooks/use-objekt-spin";

type Props = {
  state: SpinStateSending;
};

/**
 * Objekt has been sent, waiting for transaction to be confirmed.
 */
export default function StatePending({ state }: Props) {
  return <div>objekt is being sent...</div>;
}
