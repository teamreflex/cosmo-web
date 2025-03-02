import { SpinStateSendError } from "@/hooks/use-objekt-spin";

type Props = {
  state: SpinStateSendError;
};

/**
 * Transaction error, show the error.
 */
export default function StateError({ state }: Props) {
  return <div>objekt send failed!</div>;
}
