import { fetchObjektLists } from "@/lib/server/objekts/lists";
import ListDropdown from "../lists/list-dropdown";
import { Suspense } from "react";

type Props = {
  nickname: string;
  address: string;
  allowCreate: boolean;
};

export default async function ListsButton({
  nickname,
  address,
  allowCreate,
}: Props) {
  const lists = await fetchObjektLists(address);

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
