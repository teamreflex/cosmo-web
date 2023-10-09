"use client";

import { format } from "date-fns";

type Props = {
  at: string;
};

export default function GravityVoteTimestamp({ at }: Props) {
  return <p className="text-white/80">{format(new Date(at), "yy.MM.dd")}</p>;
}
