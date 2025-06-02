import { type PropsWithChildren, Suspense } from "react";
import CopyAddressButton from "@/components/profile/copy-address-button";
import TradesButton from "@/components/profile/trades-button";
import ComoButton from "@/components/profile/como-button";
import ProgressButton from "@/components/profile/progress-button";
import UserAvatar from "@/components/profile/user-avatar";
import Skeleton from "@/components/skeleton/skeleton";
import ListDropdownClient from "@/components/lists/list-dropdown.client";
import Link from "next/link";
import ComoBalanceRenderer from "@/components/navbar/como-balances";
import { Addresses } from "@/lib/utils";
import {
  getCurrentAccount,
  getSession,
  getTargetAccount,
} from "@/app/data-fetching";
import {
  CosmoVerifiedBadge,
  DiscordBadge,
  ModhausBadge,
  TwitterBadge,
} from "@/components/profile/profile-badges";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function ProfileLayout(props: Props) {
  const [session, params] = await Promise.all([getSession(), props.params]);
  const [account, target] = await Promise.all([
    getCurrentAccount(session?.session.userId),
    getTargetAccount(params.nickname),
  ]);

  const authenticated = account?.cosmo?.address === target.cosmo.address;

  return (
    <main className="relative container flex flex-col py-2">
      <div className="grid grid-rows-[auto_auto_min-content] grid-cols-2 md:grid-cols-3 gap-2 md:h-24">
        {/* user block */}
        <div className="row-span-2 md:row-span-3 flex flex-row gap-4">
          <Suspense
            fallback={
              <Skeleton className="h-24 w-24 rounded-full aspect-square shrink-0" />
            }
          >
            <UserAvatar
              className="w-24 h-24"
              username={target.cosmo.username}
            />
          </Suspense>

          <div className="flex flex-row">
            <div className="flex flex-col gap-2 justify-center h-24">
              <Link
                href={`/@${target.cosmo.username}`}
                className="w-fit text-2xl leading-6 font-cosmo uppercase underline underline-offset-4 decoration-transparent hover:decoration-cosmo transition-colors"
                prefetch={false}
              >
                {target.cosmo.username}
              </Link>

              <ComoBalanceRenderer address={target.cosmo.address} />

              {/* badges? */}
              <div className="flex flex-row gap-2 h-5">
                {target.verified && <CosmoVerifiedBadge />}
                {target.cosmo.address === Addresses.SPIN && <ModhausBadge />}
                {target.user?.showSocials === true &&
                  target.user?.social.discord !== undefined && (
                    <DiscordBadge handle={target.user.social.discord} />
                  )}
                {target.user?.showSocials === true &&
                  target.user?.social.twitter !== undefined && (
                    <TwitterBadge handle={target.user.social.twitter} />
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* profile-related buttons */}
        <div className="row-start-3 md:row-start-auto col-span-3 md:col-span-2 flex flex-wrap gap-2 justify-center md:justify-end">
          <CopyAddressButton address={target.cosmo.address} />
          <TradesButton cosmo={target.cosmo} />
          <ComoButton cosmo={target.cosmo} />
          <ProgressButton cosmo={target.cosmo} />
          <ListDropdownClient
            objektLists={target.objektLists}
            allowCreate={authenticated}
            username={target.cosmo.username}
          />

          {/* content gets portaled in */}
          <div
            className="h-10 lg:h-8 flex items-center empty:hidden"
            id="help"
          />
          <div
            className="h-10 flex items-center lg:hidden"
            id="filters-button"
          />
        </div>

        {/* objekt total, gets portaled in */}
        <div className="flex col-start-3 row-start-2 md:row-start-3 h-6 place-self-end">
          <span id="objekt-total" />
        </div>
      </div>

      {props.children}
    </main>
  );
}
