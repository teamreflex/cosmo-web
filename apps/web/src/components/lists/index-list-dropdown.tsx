import { currentAccountQuery } from "@/lib/queries/core";
import type { ObjektList } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import ListDropdown from "./list-dropdown";

export default function IndexListDropdown() {
  const { data } = useSuspenseQuery(currentAccountQuery);

  if (!data) return null;

  function createListUrl(list: ObjektList) {
    return data?.cosmo
      ? `/@${data.cosmo.username}/list/${list.slug}`
      : `/list/${list.id}`;
  }

  return (
    <ListDropdown
      objektLists={data.objektLists}
      allowCreate={true}
      createListUrl={createListUrl}
    />
  );
}
