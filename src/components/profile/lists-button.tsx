import ListDropdown from "../lists/list-dropdown";
import { Suspense } from "react";
import { getObjektLists } from "@/app/data-fetching";

type Props = {
  nickname: string;
  allowCreate: boolean;
};

export default async function ListsButton({ nickname, allowCreate }: Props) {
  const lists = await getObjektLists(nickname);

  return (
    <Suspense
      fallback={
        <div className="bg-accent size-10 animate-pulse rounded-full" />
      }
    >
      <ListDropdown
        lists={lists}
        nickname={nickname}
        allowCreate={allowCreate}
      />
    </Suspense>
  );
}
