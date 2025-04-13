import {
  CosmoGravity,
  CosmoOngoingGravity,
  CosmoPastGravity,
  CosmoUpcomingGravity,
} from "@/lib/universal/cosmo/gravity";
import { isFuture, isPast } from "date-fns";
import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import PastDetails from "./past/past-details";
import OngoingDetails from "./ongoing/ongoing-details";
import UpcomingDetails from "./upcoming/upcoming-details";

type Props = {
  artist: CosmoArtistBFF;
  gravity: CosmoGravity;
  authenticated: boolean;
};

export default function GravityCoreDetails({
  artist,
  gravity,
  authenticated,
}: Props) {
  if (isPast(new Date(gravity.entireEndDate))) {
    return (
      <PastDetails artist={artist} gravity={gravity as CosmoPastGravity} />
    );
  }

  if (isFuture(new Date(gravity.entireStartDate))) {
    return <UpcomingDetails gravity={gravity as CosmoUpcomingGravity} />;
  }

  return (
    <OngoingDetails
      artist={artist}
      gravity={gravity as CosmoOngoingGravity}
      authenticated={authenticated}
    />
  );
}
