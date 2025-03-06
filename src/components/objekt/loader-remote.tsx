"use client";

import {
  ObjektResponseOptions,
  useObjektResponse,
} from "@/hooks/use-objekt-response";
import { ReactElement, useMemo } from "react";
import Portal from "../portal";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ObjektRowItem } from "./virtualized-grid";
import { CosmoObjekt } from "@/lib/universal/cosmo/objekts";

type Props<Response, Item> = {
  children: (props: RenderProps<Item>) => ReactElement;
  options: ObjektResponseOptions<Response, Item>;
  pins?: CosmoObjekt[];
  hidePins?: boolean;
  shouldRender?: (objekt: Item) => boolean;
  gridColumns: number;
  showTotal?: boolean;
};

export default function LoaderRemote<Response, Item>({
  pins = [],
  hidePins = true,
  shouldRender = () => true,
  showTotal = false,
  ...props
}: Props<Response, Item>) {
  // data
  const { query, total, items } = useObjektResponse(props.options);

  // merge pins and items
  const rows = useMemo(() => {
    const initialItems = [
      ...(hidePins
        ? []
        : pins.map((pin) => ({
            type: "pin" as const,
            item: pin,
          }))),
      ...items.filter(shouldRender).map((item) => ({
        type: "item" as const,
        item,
      })),
    ];

    const result: ObjektRowItem<Item>[][] = [];
    for (let i = 0; i < initialItems.length; i += props.gridColumns) {
      result.push(initialItems.slice(i, i + props.gridColumns));
    }
    return result;
  }, [items, pins, shouldRender, props.gridColumns, hidePins]);

  return (
    <div className="contents">
      {props.children({
        rows,
      })}

      {showTotal === true && <Portal to="#objekt-total">{total}</Portal>}
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
};
