"use client";

import { CosmoOngoingGravity } from "@/lib/server/cosmo";
import { PropsWithClassName, cn } from "@/lib/utils";
import { intervalToDuration } from "date-fns";
import { useEffect, useState } from "react";

type Props = PropsWithClassName<{
  pollEndDate?: string;
  gravityEndDate: string;
}>;

export default function GravityOngoingCountdown({
  className,
  pollEndDate,
  gravityEndDate,
}: Props) {
  const [timeLeft, setTimeLeft] = useState("00H: 00M: 00S");

  const duration = intervalToDuration({
    start: new Date(),
    end: new Date(pollEndDate ?? gravityEndDate),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const hours = (duration.days ?? 0) * 23 + (duration.hours ?? 0);
      const minutes = duration.minutes?.toString().padStart(2, "0");
      const seconds = duration.seconds?.toString().padStart(2, "0");

      setTimeLeft(`${hours}H: ${minutes}M: ${seconds}S`);
    }, 1000);

    return () => clearInterval(interval);
  });

  return (
    <div
      className={cn(
        "text-white w-full flex justify-center py-2 gap-2",
        pollEndDate ? "bg-cosmo-hover" : "bg-cosmo-text",
        className
      )}
    >
      {pollEndDate ? (
        <p className="font-cosmo tabular-nums">{timeLeft}</p>
      ) : (
        <p>Counting Polls</p>
      )}
    </div>
  );
}
