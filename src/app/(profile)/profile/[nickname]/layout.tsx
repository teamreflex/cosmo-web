import { PropsWithChildren, Suspense } from "react";
import CopyAddressButton from "@/components/profile/copy-address-button";
import TradesButton from "@/components/profile/trades-button";
import ComoButton from "@/components/profile/como-button";
import ProgressButton from "@/components/profile/progress-button";
import UserAvatar from "@/components/profile/user-avatar";
import Skeleton from "@/components/skeleton/skeleton";
import ListDropdown from "@/components/lists/list-dropdown";
import Link from "next/link";
import ModhausLogo from "@/assets/modhaus.png";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ComoBalanceRenderer from "@/components/navbar/como-balances";
import { Addresses } from "@/lib/utils";
import CosmoLogo from "@/assets/cosmo.webp";
import {
  getCurrentAccount,
  getSession,
  getTargetAccount,
} from "@/app/data-fetching";

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
      <div className="grid grid-rows-3 grid-cols-2 md:grid-rows-3 md:grid-cols-3 gap-2 md:h-24">
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
                {target.verified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Image
                          className="rounded shrink-0 invert dark:invert-0"
                          src={CosmoLogo.src}
                          alt="COSMO"
                          width={20}
                          height={20}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start">
                        <span>Account has been verified by the owner</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {target.cosmo.address === Addresses.SPIN && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Image
                          className="invert dark:invert-0"
                          src={ModhausLogo.src}
                          alt="Modhaus"
                          width={20}
                          height={20}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start">
                        <span>Official Modhaus account</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* profile-related buttons */}
        <div className="row-start-3 md:row-start-auto col-span-3 md:col-span-2 flex flex-wrap gap-2 justify-center md:justify-end">
          <CopyAddressButton address={target.cosmo.address} />
          <TradesButton username={target.cosmo.username} />
          <ComoButton username={target.cosmo.username} />
          <ProgressButton username={target.cosmo.username} />
          <ListDropdown
            objektLists={target.objektLists}
            username={target.cosmo.username}
            allowCreate={authenticated}
          />

          {/* content gets portaled in */}
          <div className="h-10 lg:h-8 flex items-center" id="help" />
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
