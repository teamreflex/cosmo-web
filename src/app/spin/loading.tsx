import Image from "next/image";
import SpinTicket from "@/assets/spin-ticket.png";
import Skeleton from "@/components/skeleton/skeleton";

export default function SpinLoading() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex gap-2 items-center w-full pb-1 justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">Spin</h1>
          <span className="h-5 flex items-center gap-2 text-xs">
            <Image
              src={SpinTicket.src}
              alt="Spin Ticket"
              width={20}
              height={20}
            />
            <Skeleton className="h-3 w-18 rounded-full" />
          </span>
        </div>

        <Skeleton className="h-12 w-38 rounded-full" />
      </div>

      {/* content */}
      <div className="flex flex-col gap-4">
        {/* stepper */}
        <div className="grid grid-cols-3 gap-4 items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-border h-1 w-full" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Select</h3>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="bg-border h-1 w-full" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Send</h3>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="bg-border h-1 w-full" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Spin</h3>
            </div>
          </div>
        </div>

        {/* idle state */}
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 items-center justify-center mx-auto w-full">
            <Skeleton className="flex items-center justify-center rounded-2xl md:rounded-lg aspect-photocard w-2/3 md:w-48" />
          </div>
        </div>
      </div>
    </main>
  );
}
