import { fetchSpinTickets } from "@/lib/server/cosmo/spin";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import TicketCountdown from "./ticket-countdown";

type Props = {
  token: string;
  artist: ValidArtist;
};

export default async function AvailableTickets(props: Props) {
  const data = await fetchSpinTickets(props.token, props.artist);

  return (
    <div className="flex flex-col text-xs">
      <span>{data.availableTicketsCount} tickets available</span>
      {data.nextReceiveAt !== null && (
        <TicketCountdown nextReceiveAt={data.nextReceiveAt} />
      )}
    </div>
  );
}
