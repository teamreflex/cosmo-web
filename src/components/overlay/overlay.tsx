import { OMAStorageProvider } from "@/hooks/use-oma";
import MusicPlayer from "./music-player/music-player";
import ScanQR from "./scan-qr";

export default function Overlay() {
  return (
    <OMAStorageProvider>
      <div className="fixed left-0 bottom-0 w-full h-fit z-50 flex justify-between pointer-events-none p-2 md:p-6">
        <MusicPlayer />
        <ScanQR />
      </div>
    </OMAStorageProvider>
  );
}
