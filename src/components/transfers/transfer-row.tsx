import { IconRotate360 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { AggregatedTransfer } from "@/lib/universal/transfers";
import { Addresses } from "@/lib/utils";

type Props = {
  row: AggregatedTransfer;
  address: string;
};

export default function TransferRow({ row, address }: Props) {
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();
  const serial = row.serial?.toString().padStart(5, "0");

  const timestamp = new Date(row.transfer.timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return (
    <div className="text-xs sm:text-sm items-center grid grid-cols-[3fr_2fr_2fr] gap-2 h-14 px-4 border-t border-accent hover:bg-secondary/40 transition-colors">
      <div className="flex flex-col">
        <span>{row.collection?.collectionId ?? "Unknown"}</span>
        <span className="text-xs">#{serial}</span>
      </div>
      <User row={row} isReceiver={isReceiver} />
      <span className="text-right">{timestamp}</span>
    </div>
  );
}

type UserProps = {
  row: AggregatedTransfer;
  isReceiver: boolean;
};

function User({ row, isReceiver }: UserProps) {
  // cosmo spin related transfers
  if (row.isSpin && isReceiver === false) {
    return (
      <div className="flex gap-2 items-center">
        <IconRotate360 className="size-8" />
        <div className="flex flex-col">
          <TransferAction isReceiver={isReceiver} />
          <span>COSMO Spin</span>
        </div>
      </div>
    );
  }

  // received from cosmo
  if (isReceiver && row.transfer.from === Addresses.NULL) {
    return (
      <div className="flex gap-2 items-center">
        <img
          src="/cosmo.webp"
          alt="COSMO"
          className="size-7 aspect-square rounded-full ring ring-accent"
        />
        <div className="flex flex-col">
          <TransferAction isReceiver={true} />
          <span>COSMO</span>
        </div>
      </div>
    );
  }

  // received from user or sent
  const address = isReceiver ? row.transfer.from : row.transfer.to;
  return (
    <div className="flex gap-2 items-center">
      <img
        src="/profile.webp"
        alt="Cosmo"
        className="size-7 aspect-square rounded-full bg-cosmo-profile p-1"
      />
      <div className="flex flex-col">
        <TransferAction isReceiver={isReceiver} />
        <Link to={`/@${row.username ?? address}`} className="underline">
          {row.username ?? address.substring(0, 8)}
        </Link>
      </div>
    </div>
  );
}

function TransferAction({ isReceiver }: { isReceiver: boolean }) {
  return (
    <div
      data-receiver={isReceiver}
      className="text-xs py-px px-1.5 rounded-full bg-[#8ebdd1] data-[receiver=true]:bg-[#D5B7E2] text-foreground w-fit"
    >
      <span className="drop-shadow">{isReceiver ? "From" : "To"}</span>
    </div>
  );
}
