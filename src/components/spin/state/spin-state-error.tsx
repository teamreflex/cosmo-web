import { SpinStateSendError } from "@/hooks/use-objekt-spin";
import { TriangleAlert } from "lucide-react";

type Props = {
  state: SpinStateSendError;
};

/**
 * Transaction error, show the error.
 */
export default function StateError({ state }: Props) {
  return (
    <div className="flex flex-col items-center">
      <TriangleAlert className="h-10 w-10" />
      <p className="text-sm font-semibold">Error sending objekt</p>
    </div>
  );
}
