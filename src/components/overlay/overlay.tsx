import ScanQR from "./scan-qr";

export default function Overlay() {
  return (
    <div className="fixed right-2 bottom-2 w-fit h-fit z-50">
      <ScanQR />
    </div>
  );
}
