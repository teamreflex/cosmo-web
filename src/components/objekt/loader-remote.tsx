"use client";

import {
  ObjektResponseOptions,
  useObjektResponse,
} from "@/hooks/use-objekt-response";
import { useProfileContext } from "@/hooks/use-profile";
import { ReactElement, useMemo } from "react";
import Portal from "../portal";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ObjektRowItem } from "./virtualized-grid";

type Props<Response, Item> = {
  children: (props: RenderProps<Item>) => ReactElement;
  options: ObjektResponseOptions<Response, Item>;
  hidePins?: boolean;
  shouldRender: (objekt: Item) => boolean;
  gridColumns: number;
  showTotal?: boolean;
};

export default function LoaderRemote<Response, Item>(
  props: Props<Response, Item>
) {
  // data
  const { query, total, items } = useObjektResponse(props.options);
  const pins = useProfileContext((ctx) => ctx.pins);
  const hidePins = props.hidePins ?? true;

  // merge pins and items
  const rows = useMemo(() => {
    const initialItems = [
      ...(hidePins
        ? []
        : pins.map((pin) => ({
            type: "pin" as const,
            item: pin,
          }))),
      ...items.filter(props.shouldRender).map((item) => ({
        type: "item" as const,
        item,
      })),
    ];

    const result: ObjektRowItem<Item>[][] = [];
    for (let i = 0; i < initialItems.length; i += props.gridColumns) {
      result.push(initialItems.slice(i, i + props.gridColumns));
    }
    return result;
  }, [items, pins, props.shouldRender, props.gridColumns, hidePins]);

  return (
    <div className="contents">
      {props.children({
        rows,
        hidePins,
      })}

      {props.showTotal === true && <Portal to="#objekt-total">{total}</Portal>}
      <Portal to="#pagination">
        <InfiniteQueryNext
          status={query.status}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </div>
  );
}

type RenderProps<Item> = {
  rows: ObjektRowItem<Item>[][];
  hidePins: boolean;
};
