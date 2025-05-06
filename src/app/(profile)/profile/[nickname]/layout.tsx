import { getUserOrProfile } from "@/app/data-fetching";
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
import type { ObjektList } from "@/lib/server/db/schema";
import { Addresses } from "@/lib/utils";
import { PublicUser } from "@/lib/universal/auth";
import CosmoLogo from "@/assets/cosmo.webp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { env } from "@/env";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function ProfileLayout(props: Props) {
  const params = await props.params;
  const user = await getUserOrProfile(params.nickname);

  const href = user.href ? `/@${user.href}` : null;

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
            <UserAvatar className="w-20 h-20" username={user.username} />
          </Suspense>

          <div className="flex flex-col justify-between w-full">
            <div className="flex gap-2 items-center">
              {href !== null ? (
                <Link
                  href={href}
                  className="w-fit text-2xl lg:text-3xl font-cosmo uppercase underline underline-offset-4 decoration-transparent hover:decoration-cosmo transition-colors"
                >
                  {user.username}
                </Link>
              ) : (
                <span className="w-fit text-2xl lg:text-3xl font-cosmo uppercase">
                  {user.username}
                </span>
              )}

              {user.fromCosmo && (
                <AlertDialog>
                  <AlertDialogTrigger>
                    <Image
                      className="rounded-md shrink-0 invert dark:invert-0"
                      src={CosmoLogo.src}
                      alt="COSMO"
                      width={24}
                      height={24}
                    />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>COSMO Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        This account has been loaded from COSMO.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex flex-col text-sm">
                      <p>This icon indicates one of two things:</p>
                      <ul className="list-disc list-inside">
                        <li>
                          The user has not linked their COSMO account yet, but
                          the username matches a COSMO ID.
                        </li>
                        <li>
                          There is no {env.NEXT_PUBLIC_APP_NAME} account for
                          this username, but it matches a COSMO ID.
                        </li>
                      </ul>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogAction>Close</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {user.cosmoAddress === Addresses.SPIN && (
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
              {user.cosmoAddress !== undefined && (
                <ComoBalanceRenderer address={user.cosmoAddress} />
              )}
              <div></div>
              <span className="h-10 flex items-center last:ml-auto">
                <div id="objekt-total" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* mobile buttons */}
      <Buttons user={user} objektLists={[]} />

      {props.children}
    </main>
  );
}

type ButtonsProps = {
  user: PublicUser;
  objektLists: ObjektList[];
};

function Buttons({ user, objektLists }: ButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center lg:justify-normal md:absolute md:top-2 md:right-4">
      {user.cosmoAddress !== undefined && (
        <CopyAddressButton address={user.cosmoAddress} />
      )}
      <TradesButton href={user.href} />
      <ComoButton href={user.href} />
      <ProgressButton href={user.href} />
      <ListDropdown lists={objektLists} href={user.href} allowCreate={false} />

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
