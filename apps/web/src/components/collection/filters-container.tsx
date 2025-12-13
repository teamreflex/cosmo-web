import { useState } from "react";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import Portal from "../portal";
import { Button } from "../ui/button";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  isPortaled?: boolean;
}>;

export default function FiltersContainer({ children, isPortaled }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="group flex flex-col gap-2 data-[show=false]:pb-0 lg:data-[show=false]:pb-2"
      data-show={show}
    >
      <div className="flex flex-row items-center justify-center gap-2 lg:hidden">
        {!isPortaled && <div id="filters-button" />}
        <Portal to="#filters-button">
          <Button
            className="h-10 rounded-full"
            variant="secondary"
            size="sm"
            onClick={() => setShow((prev) => !prev)}
          >
            <IconAdjustmentsHorizontal />
            <span>Filters</span>
          </Button>
        </Portal>
      </div>

      {children}
    </div>
  );
}
