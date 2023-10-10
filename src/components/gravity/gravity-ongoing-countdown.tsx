"use client";

import { intervalToDuration } from "date-fns";
import { useEffect, useState } from "react";

type Props = {
  endsAt: string;
};

export default function GravityOngoingCountdown({ endsAt }: Props) {
  const [timeLeft, setTimeLeft] = useState("00H: 00M: 00S");

  const duration = intervalToDuration({
    start: new Date(),
    end: new Date(endsAt),
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

  return <p className="font-cosmo tabular-nums">{timeLeft}</p>;
}
