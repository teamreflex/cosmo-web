import { m } from "@/i18n/messages";
import type { ReactNode } from "react";

type Props = {
  /**
   * The count beside the title.
   */
  total: ReactNode;
  /**
   * Buttons at the end of the title row.
   */
  actions?: ReactNode;
  /**
   * Centred in the header from lg, beside the count from md and on its own
   * row on phones.
   */
  children?: ReactNode;
};

/**
 * The title and the view's count.
 */
export default function MarketHeader({ total, actions, children }: Props) {
  return (
    <div className="border-b border-border">
      <div className="relative container flex flex-wrap items-center gap-x-3 gap-y-3 py-3 md:h-14 md:flex-nowrap md:py-0">
        <h1 className="order-1 font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {m.market_header()}
        </h1>

        <div className="order-2">{total}</div>

        {actions !== undefined && (
          <div className="order-3 ml-auto flex items-center gap-2 md:order-4">
            {actions}
          </div>
        )}

        {children !== undefined && (
          <div className="order-5 flex w-full justify-center md:order-3 md:ml-auto md:w-auto lg:pointer-events-none lg:absolute lg:inset-0 lg:items-center">
            <div className="lg:pointer-events-auto">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
