"use client";

import { PropsWithClassName, cn } from "@/lib/utils";
import { intervalToDuration } from "date-fns";
import { useState } from "react";
import Hydrated from "../hydrated";
import { useInterval } from "usehooks-ts";

type Props = PropsWithClassName<{
  pollEndDate?: string;
  gravityEndDate: string;
}>;

export default function GravityOngoingCountdown({
  className,
  pollEndDate,
  gravityEndDate,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(() => {
    return calculateTimeLeft(pollEndDate ?? gravityEndDate);
  });

  useInterval(() => {
    setTimeLeft(calculateTimeLeft(pollEndDate ?? gravityEndDate));
  }, 1000);

  return (
    <div
      className={cn(
        "text-white w-full flex justify-center py-2 gap-2",
        pollEndDate ? "bg-cosmo-hover" : "bg-cosmo-text",
        className
      )}
    >
      {pollEndDate ? (
        <Hydrated
          fallback={
            <p className="font-cosmo tabular-nums blur-xs">00H: 00M: 00S</p>
          }
        >
          <p className="font-cosmo tabular-nums">{timeLeft}</p>
        </Hydrated>
      ) : (
        <p>Counting Polls</p>
      )}
    </div>
  );
}

function calculateTimeLeft(endDate: string) {
  const duration = intervalToDuration({
    start: new Date(),
    end: new Date(endDate),
  });

  const hoursNum = (duration.hours ?? 0) + (duration.days ?? 0) * 24;
  const hours = hoursNum.toString().padStart(2, "0");
  const minutes = duration.minutes?.toString().padStart(2, "0") ?? "00";
  const seconds = duration.seconds?.toString().padStart(2, "0") ?? "00";

  return `${hours}H: ${minutes}M: ${seconds}S`;
}
