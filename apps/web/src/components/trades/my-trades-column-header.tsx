import { m } from "@/i18n/messages";
import type { MyTradesTab } from "@/lib/universal/trades";
import { SlipColumnHeader } from "../trade-listings/slip";

/**
 * The lg column headings over a trade tab's slips.
 */
export default function MyTradesColumnHeader({ tab }: { tab: MyTradesTab }) {
  return (
    <SlipColumnHeader variant="trade">
      <span>{m.my_trades_column_type()}</span>
      <span>{m.my_trades_column_send()}</span>
      <span />
      <span>{m.my_trades_column_get()}</span>
      <span>{m.my_trades_column_status()}</span>
      <span>{m.my_trades_column_with()}</span>
      <span className="text-right">
        {tab === "active"
          ? m.my_trades_column_time()
          : m.my_trades_column_ended()}
      </span>
    </SlipColumnHeader>
  );
}
