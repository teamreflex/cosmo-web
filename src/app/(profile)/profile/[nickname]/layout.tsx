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
import { FullAccount } from "@/lib/universal/cosmo-accounts";

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
    <main className="relative container flex flex-col gap-2 py-2">
      {/* user block */}
      <div className="flex flex-col">
        <div className="flex flex-row gap-4 items-center">
          <Suspense
            fallback={
              <Skeleton className="h-20 w-20 rounded-full aspect-square shrink-0" />
            }
          >
            <UserAvatar
              className="w-20 h-20"
              username={target.cosmo.username}
            />
          </Suspense>

          <div className="flex flex-col justify-between w-full">
            <div className="flex gap-2 items-center">
              <Link
                href={`/@${target.cosmo.username}`}
                className="w-fit text-2xl lg:text-3xl font-cosmo uppercase underline underline-offset-4 decoration-transparent hover:decoration-cosmo transition-colors"
                prefetch={false}
              >
                {target.cosmo.username}
              </Link>

              {target.verified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Image
                        className="rounded-md shrink-0 invert dark:invert-0"
                        src={CosmoLogo.src}
                        alt="COSMO"
                        width={24}
                        height={24}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
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
                        width={28}
                        height={27}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span>Official Modhaus account</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <ComoBalanceRenderer address={target.cosmo.address} />
              <div></div>
              <span className="h-10 flex items-center last:ml-auto">
                <div id="objekt-total" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* mobile buttons */}
      <Buttons target={target} authenticated={authenticated} />

      {props.children}
    </main>
  );
}

type ButtonsProps = {
  target: FullAccount;
  authenticated: boolean;
};

function Buttons({ target, authenticated }: ButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center lg:justify-normal md:absolute md:top-2 md:right-4">
      <CopyAddressButton address={target.cosmo.address} />
      <TradesButton username={target.cosmo.username} />
      <ComoButton username={target.cosmo.username} />
      <ProgressButton username={target.cosmo.username} />
      <ListDropdown
        lists={[]}
        username={target.cosmo.username}
        allowCreate={authenticated}
      />

      {/* content gets portaled in */}
      <span className="h-10 lg:h-8 flex items-center">
        <div id="help" />
      </span>
      <span className="h-10 flex items-center lg:hidden">
        <div id="filters-button" />
      </span>
    </div>
  );
}
