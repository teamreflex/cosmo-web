import type { ObjektList } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import ListDropdown from "./list-dropdown";

const route = getRouteApi("/@{$username}");

type Props = {
  isAuthenticated: boolean;
};

export default function ProfileListDropdown({ isAuthenticated }: Props) {
  const { targetAccountOptions } = route.useRouteContext();
  const { data } = useSuspenseQuery(targetAccountOptions);

  return (
    <ListDropdown
      objektLists={data.objektLists}
      allowCreate={isAuthenticated}
      createListUrl={(list: ObjektList) =>
        `/@${data.cosmo.username}/list/${list.slug}`
      }
    />
  );
}
