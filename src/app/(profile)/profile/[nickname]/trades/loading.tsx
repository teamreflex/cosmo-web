import { TransfersSkeleton } from "@/components/transfers/transfers-renderer";

export default function UserTransfersLoading() {
  return (
    <div className="flex py-2">
      <TransfersSkeleton />
    </div>
  );
}
