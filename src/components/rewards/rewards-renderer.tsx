import {
  fetchEventRewardAvailable,
  fetchPendingEventRewards,
} from "@/lib/server/cosmo/rewards";
import { TokenPayload } from "@/lib/universal/auth";
import Image from "next/image";
import RewardTimestamp from "./reward-timestamp";
import RewardDialog from "./reward-dialog";
import { CosmoRewardItem } from "@/lib/universal/cosmo/rewards";

type Props = {
  user: TokenPayload;
};

export default async function RewardsRenderer({ user }: Props) {
  const isClaimable = await fetchEventRewardAvailable(user.accessToken);
  if (isClaimable === false) return null;

  const { count, items, claimCount } = await fetchPendingEventRewards(
    user.accessToken
  );

  return (
    <RewardDialog
      availableForClaim={claimCount}
      trigger={<RewardTrigger />}
      content={
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-xl text-center">
            {count} items available
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <RewardItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      }
    />
  );
}

function RewardTrigger() {
  return (
    <button className="flex flex-col w-full h-full rounded-lg md:rounded-xl lg:rounded-2xl bg-gradient-to-b from-cosmo-text to-cosmo overflow-hidden">
      <p className="text-left text-xl lg:text-3xl font-semibold pt-4 px-4 drop-shadow">
        Objekt reward available
      </p>
    </button>
  );
}

function RewardItem({ item }: { item: CosmoRewardItem }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex relative aspect-photocard object-contain rounded-lg md:rounded-xl overflow-hidden">
        <Image src={item.thumbnailImage} alt={item.title} fill={true} />

        {item.isClaimed && (
          <div className="absolute top-0 right-0 flex w-full h-full items-center justify-center bg-accent/50 px-1 py-1 text-sm font-semibold drop-shadow">
            Claimed
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <p className="font-semibold truncate">{item.title}</p>
        <p className="text-xs">{item.category}</p>
      </div>

      <div className="rounded bg-accent px-1 py-1 text-sm w-fit">
        until <RewardTimestamp end={item.endedAt} />
      </div>
    </div>
  );
}
