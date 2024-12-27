import { decodeUser, getSelectedArtist } from "@/app/data-fetching";
import { UserStateProvider } from "@/hooks/use-user-state";
import { default as ScanQRClient } from "./scan-qr.client";

export default async function ScanQR() {
  const [artist, token] = await Promise.all([
    getSelectedArtist(),
    decodeUser(),
  ]);

  return (
    <UserStateProvider artist={artist} token={token}>
      <ScanQRClient />
    </UserStateProvider>
  );
}
