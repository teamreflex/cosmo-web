import { fetchProfilesForAddress } from "@/lib/server/auth";

export default async function PreviousIds({ address }: { address: string }) {
  const profiles = await fetchProfilesForAddress(address);
  if (profiles.length < 2) return null;

  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold">Previous IDs</h3>

      {profiles.map((profile) => (
        <div key={profile.id} className="flex flex-col">
          <p className="font-semibold">{profile.nickname}</p>
          <p className="text-foreground/80 text-xs">{profile.userAddress}</p>
        </div>
      ))}
    </div>
  );
}
