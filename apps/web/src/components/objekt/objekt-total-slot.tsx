/**
 * Where `VirtualizedObjektGrid` portals its total. Holds the total's height
 * while the query is pending so a stacked header doesn't shift.
 */
export default function ObjektTotalSlot() {
  return (
    <div
      id="objekt-total"
      className="flex h-4 items-center font-mono text-xs text-muted-foreground tabular-nums"
    />
  );
}
