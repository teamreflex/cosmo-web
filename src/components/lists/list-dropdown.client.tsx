"use client";

import { ObjektList } from "@/lib/server/db/schema";
import ListDropdown from "./list-dropdown";

type Props = {
  objektLists: ObjektList[];
  allowCreate: boolean;
  username: string;
};

/**
 * Because RSC can't pass functions to client components...
 */
export default function ListDropdownClient(props: Props) {
  function createListUrl(list: ObjektList) {
    return `/@${props.username}/list/${list.slug}`;
  }

  return <ListDropdown {...props} createListUrl={createListUrl} />;
}
