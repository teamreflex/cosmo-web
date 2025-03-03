"use client";

import { useEffect, useState } from "react";

type Props = {
  nextReceiveAt: string;
  triggerRefetch: () => void;
  isRefetching: boolean;
};

export default function TicketCountdown(props: Props) {
  const [timeRemaining, setTimeRemaining] = useState<string>("00h 00m 00s");

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const targetTime = new Date(props.nextReceiveAt);
      let diff = targetTime.getTime() - now.getTime();

      // if time has passed, show 00:00:00
      if (diff <= 0 && !props.isRefetching) {
        setTimeRemaining("00h 00m 00s");
        props.triggerRefetch();
        return;
      }

      // calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);

      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * (1000 * 60);

      const seconds = Math.floor(diff / 1000);

      // format with leading zeros
      const formattedHours = hours.toString().padStart(2, "0");
      const formattedMinutes = minutes.toString().padStart(2, "0");
      const formattedSeconds = seconds.toString().padStart(2, "0");

      setTimeRemaining(
        `${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`
      );
    };

    // calculate initial time
    calculateTimeRemaining();

    // update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    // cleanup interval when component unmounts
    return () => clearInterval(interval);
  }, [props.nextReceiveAt]);

  return (
    <span
      className="tabular-nums text-cosmo-text font-semibold"
      suppressHydrationWarning
    >
      {timeRemaining}
    </span>
  );
}
