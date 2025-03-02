import { SpinStateCreated, useSpinSubmit } from "@/hooks/use-objekt-spin";

type Props = {
  state: SpinStateCreated;
};

/**
 * Spin has been created, send the objekt.
 */
export default function StateCreated({ state }: Props) {
  const { handleSend, isPending } = useSpinSubmit();

  function handleClick() {
    handleSend(state);
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      send objekt
    </button>
  );
}
