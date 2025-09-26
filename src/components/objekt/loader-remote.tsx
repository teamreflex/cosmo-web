import { useMemo } from "react";
import Portal from "../portal";
import { InfiniteQueryNext } from "../infinite-query-pending";
import type { DefaultError, QueryKey } from "@tanstack/react-query";
import type { ReactElement } from "react";
import type { ObjektRowItem } from "./virtualized-grid";
import type { CosmoObjekt } from "@/lib/universal/cosmo/objekts";
import type { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { useObjektResponse } from "@/hooks/use-objekt-response";

type Props<
  TResponse,
  TItem,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
> = {
  children: (props: RenderProps<TItem>) => ReactElement;
  options: ObjektResponseOptions<TResponse, TItem, TError, TQueryKey>;
  pins?: CosmoObjekt[];
  hidePins?: boolean;
  shouldRender?: (objekt: TItem) => boolean;
  gridColumns: number;
  showTotal?: boolean;
  searchable?: boolean;
};

export default function LoaderRemote<
  TResponse,
  TItem,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>({
  pins = [],
  hidePins = true,
  shouldRender = () => true,
  showTotal = false,
  searchable = false,
  ...props
}: Props<TResponse, TItem, TError, TQueryKey>) {
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

    const result: ObjektRowItem<TItem>[][] = [];
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

type RenderProps<TItem> = {
  rows: ObjektRowItem<TItem>[][];
};
