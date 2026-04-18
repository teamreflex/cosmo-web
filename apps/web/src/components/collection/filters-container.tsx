import { m } from "@/i18n/messages";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import Portal from "../portal";
import { Button } from "../ui/button";

type Props = PropsWithChildren<{
  isPortaled?: boolean;
}>;

export default function FiltersContainer({ children, isPortaled }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="group flex flex-col gap-2 border-b border-border bg-muted/40 data-[show=false]:pb-0 lg:data-[show=false]:pb-0"
      data-show={show}
    >
      <div className="container flex flex-col gap-2 lg:py-2">
        <div className="flex flex-row items-center justify-end gap-2 lg:hidden">
          {!isPortaled && <div id="filters-button" />}
          <Portal to="#filters-button">
            <Button
              variant="outline"
              size="profile"
              data-profile
              onClick={() => setShow((prev) => !prev)}
            >
              <IconAdjustmentsHorizontal className="h-5 w-5" />
              <span>{m.common_filters()}</span>
            </Button>
          </Portal>
        </div>

        {children}
      </div>
    </div>
  );
}
