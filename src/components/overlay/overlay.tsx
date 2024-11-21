import ScanQR from "./scan-qr";
import { decodeUser, getSelectedArtist } from "@/app/data-fetching";
import { UserStateProvider } from "@/hooks/use-user-state";

export default async function Overlay() {
  const artist = await getSelectedArtist();
  const token = await decodeUser();

  return (
    <UserStateProvider artist={artist} token={token}>
      <div className="fixed right-2 bottom-2 w-fit h-fit z-50">
        <ScanQR />
      </div>
    </UserStateProvider>
  );
}
