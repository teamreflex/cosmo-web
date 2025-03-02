import { SpinStateSent } from "@/hooks/use-objekt-spin";

type Props = {
  state: SpinStateSent;
};

/**
 * Transaction has been confirmed, show the hash.
 */
export default function StateSuccess({ state }: Props) {
  return <div>objekt sent, confirming with cosmo...</div>;
}
