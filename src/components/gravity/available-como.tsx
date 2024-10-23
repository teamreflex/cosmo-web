import { decodeUser, getArtistsWithMembers } from "@/app/data-fetching";
import { fetchTokenBalances } from "@/lib/server/como";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { isAddressEqual } from "@/lib/utils";

export default async function AvailableComo({
  artist,
}: {
  artist: ValidArtist;
}) {
  const user = await decodeUser();
  const [artists, balances] = await Promise.all([
    getArtistsWithMembers(),
    fetchTokenBalances(user!.address),
  ]);

  const balance = balances.find((b) =>
    isAddressEqual(
      b.contract,
      artists.find((a) => a.name === artist)?.contracts.Como
    )
  );

  if (!balance) {
    return (
      <h3 className="text-lg font-bold">
        You have 0 COMO to support this Gravity
      </h3>
    );
  }

  return (
    <h3 className="text-lg font-bold">
      You have {balance.amount} COMO to support this Gravity
    </h3>
  );
}
