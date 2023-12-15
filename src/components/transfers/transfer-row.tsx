import { AggregatedTransfer } from "@/lib/universal/transfers";
import Image from "next/image";
import CosmoImage from "@/assets/cosmo.webp";
import ProfileImage from "@/assets/profile.webp";
import Link from "next/link";
import { format } from "date-fns";

const nullAddress = "0x0000000000000000000000000000000000000000";

type Props = {
  row: AggregatedTransfer;
  address: string;
};

export default function TransferRow({ row, address }: Props) {
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  const serial = row.objekt.serial.toString().padStart(5, "0");
  const name = row.collection
    ? `${row.collection?.collectionId} #${serial}`
    : "Unknown";

  const action = isReceiver ? "Received From" : "Sent To";

  const user = isReceiver ? (
    row.transfer.from === nullAddress ? (
      <SenderCosmo />
    ) : (
      <SenderUser address={row.transfer.from} />
    )
  ) : (
    <SenderUser address={row.transfer.to} />
  );

  const timestamp = format(
    Date.parse(row.transfer.timestamp),
    "dd/MM/yy h:mmaa"
  );

  return (
    <div className="items-center grid grid-cols-4 h-12 px-4 border-t border-accent hover:bg-accent/40 transition-colors">
      <span>{name}</span>
      <span>{action}</span>
      <span>{user}</span>
      <span>{timestamp}</span>
    </div>
  );
}

function SenderCosmo() {
  return (
    <div className="flex gap-2 items-center">
      <Image
        src={CosmoImage.src}
        width={30}
        height={30}
        alt="Cosmo"
        className="rounded-full"
      />
      <span>Cosmo</span>
    </div>
  );
}

function SenderUser({ address }: { address: string }) {
  return (
    <div className="flex gap-2 items-center">
      <Image
        src={ProfileImage.src}
        width={30}
        height={30}
        alt="Cosmo"
        className="rounded-full bg-cosmo-profile p-1"
      />
      <Link href={`/@${address}`} className="underline">
        {address.substring(0, 8)}
      </Link>
    </div>
  );
}
