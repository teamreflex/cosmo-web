import { targetAccountQuery } from "@/lib/queries/core";
import type { ObjektList } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import ListDropdown from "./list-dropdown";

type Props = {
  username: string;
  isAuthenticated: boolean;
};

export default function ProfileListDropdown({
  username,
  isAuthenticated,
}: Props) {
  const { data } = useSuspenseQuery(targetAccountQuery(username));

  return (
    <ListDropdown
      username={data.cosmo.username}
      objektLists={data.objektLists}
      allowCreate={isAuthenticated}
      createListUrl={(list: ObjektList) =>
        `/@${data.cosmo.username}/list/${list.slug}`
      }
    />
  );
}
