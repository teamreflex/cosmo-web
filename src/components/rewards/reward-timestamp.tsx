"use client";

import { format } from "date-fns";

type Props = {
  end: string;
};

export default function RewardTimestamp({ end }: Props) {
  return <span>{format(new Date(end), "yy.MM.dd")}</span>;
}
