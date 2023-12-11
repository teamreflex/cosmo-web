"use client";

import { TransferResult } from "@/lib/universal/transfers";
import { columns } from "./columns";
import { TransfersDataTable } from "./data-table";

type Props = {
  nickname: string;
  address: string;
  results: TransferResult;
};

export default function TransfersRenderer({
  nickname,
  address,
  results,
}: Props) {
  return <TransfersDataTable columns={columns} data={results.results} />;
}
