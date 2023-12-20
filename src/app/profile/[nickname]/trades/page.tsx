import { Metadata } from "next";
import { cache } from "react";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import { fetchUserByIdentifier } from "@/lib/server/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User } from "lucide-react";

type Props = {
  params: { nickname: string };
};

const getUser = cache((identifier: string) =>
  fetchUserByIdentifier(identifier)
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nickname } = await getUser(params.nickname);

  return {
    title: `${nickname}'s Trades`,
  };
}

export default async function UserTransfersPage({ params }: Props) {
  const user = await getUser(params.nickname);

  return (
    <main className="container flex flex-col gap-2 py-2">
      <div className="flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between gap-2">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              Trades
            </h1>
          </div>

          {/* options */}
          <div className="flex gap-2 items-center">
            {/* profile link */}
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/@${user.isAddress ? user.address : user.nickname}`}
                className="flex items-center"
              >
                <User />
                <span className="ml-2 hidden sm:block">View Profile</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <TransfersRenderer {...user} />
    </main>
  );
}
