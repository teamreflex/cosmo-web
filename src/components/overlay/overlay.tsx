import HideOverlay from "./hide-overlay";
import ScanQR from "./scan-qr.server";

export default function Overlay() {
  return (
    <div
      id="overlay"
      className="overlay fixed right-2 bottom-2 w-fit h-fit flex flex-col gap-2 z-50"
    >
      <HideOverlay />
      <ScanQR />
    </div>
  );
}
