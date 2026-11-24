import { m } from "@/i18n/messages";
import { type MyTradesPageTab, myTradesPageTabs } from "@/lib/universal/trades";
import { useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

/**
 * The title and the tabs, which keep their place in the URL. It renders
 * while a tab loads too, so the tabs never wait on a tab's rows.
 */
export default function MyTradesHeader({ tab }: { tab: MyTradesPageTab }) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border">
      <div className="container flex h-14 items-center gap-3">
        <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {m.my_trades_title()}
        </h1>
        <Tabs
          className="ml-auto"
          value={tab}
          onValueChange={(value) => {
            const picked = myTradesPageTabs.find((option) => option === value);
            if (picked !== undefined) {
              void navigate({
                to: "/market/trades",
                search: { tab: picked },
              });
            }
          }}
        >
          <TabsList aria-label={m.my_trades_tabs()} className="max-md:h-10">
            <TabsTrigger value="active">{m.my_trades_tab_active()}</TabsTrigger>
            <TabsTrigger value="finished">
              {m.my_trades_tab_finished()}
            </TabsTrigger>
            <TabsTrigger value="listings">
              {m.my_trades_tab_listings()}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
