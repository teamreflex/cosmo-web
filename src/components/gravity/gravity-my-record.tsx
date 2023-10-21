import { CosmoPastGravity, fetchMyGravityResult } from "@/lib/server/cosmo";
import { ordinal } from "@/lib/utils";
import Image from "next/image";
import GravityVoteTimestamp from "./gravity-vote-timestamp";
import { decodeUser } from "@/app/(core)/data-fetching";

type Props = {
  gravity: CosmoPastGravity;
};

export default async function GravityMyRecord({ gravity }: Props) {
  const user = await decodeUser();
  const record = await fetchMyGravityResult(
    user!.accessToken,
    gravity.artist,
    gravity.id
  );

  return (
    <>
      {/* my contribution */}
      <div className="flex flex-col gap-2 w-full sm:w-1/2 mx-auto">
        <h3 className="font-bold">My Contribution</h3>
        <div className="bg-accent rounded-lg grid grid-cols-2 divide-x divide-background">
          {/* total como used */}
          <div className="flex flex-col items-center justify-center p-2">
            <p className="font-bold text-sm">Total COMO used</p>
            <p className="text-2xl text-cosmo-text font-bold">
              {record.totalComoUsed.toLocaleString()}
            </p>
          </div>

          {/* contribution ranking */}
          <div className="flex flex-col items-center justify-center p-2">
            <p className="font-bold text-sm">Contribution ranking</p>
            <p className="text-2xl text-cosmo-text font-bold">
              {ordinal(record.rank)}
            </p>
          </div>
        </div>
      </div>

      {/* voting record */}
      <div className="flex flex-col gap-2 w-full sm:w-1/2 mx-auto">
        <h3 className="font-bold">My Voting Record</h3>

        {record.voteStatuses.map((status, i) =>
          status.votes.map((vote) => (
            <div
              key={vote.at}
              className="flex justify-between items-center h-20 p-3 bg-accent/25 rounded-lg"
            >
              <div className="flex gap-2 items-center">
                {vote.voteImageUrl && (
                  <div className="relative aspect-square h-16">
                    <Image
                      className="absolute"
                      src={vote.voteImageUrl}
                      alt={vote.voteTo}
                      fill={true}
                    />
                  </div>
                )}

                <div className="text-sm font-semibold">
                  {vote.voteTo.split("\n").map((s, i) => (
                    <p key={i}>{s}</p>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between text-sm items-end">
                <p className="text-cosmo-text font-semibold">
                  {vote.comoUsed.toLocaleString()} COMO
                </p>
                <GravityVoteTimestamp at={vote.at} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
