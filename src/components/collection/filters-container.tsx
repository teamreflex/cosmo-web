import { PropsWithChildren, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Portal from "../portal";
import { Button } from "../ui/button";

type Props = PropsWithChildren<{
  isPortaled?: boolean;
}>;

export default function FiltersContainer({ children, isPortaled }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="flex flex-col gap-2 group lg:data-[show=false]:pb-2 data-[show=false]:pb-0"
      data-show={show}
    >
      <div className="flex flex-row items-center justify-center gap-2 lg:hidden">
        {!isPortaled && <div id="filters-button" />}
        <Portal to="#filters-button">
          <Button
            className="rounded-full"
            variant="secondary"
            size="sm"
            onClick={() => setShow((prev) => !prev)}
          >
            <SlidersHorizontal className="mr-2" />
            <span>Filters</span>
          </Button>
        </Portal>
      </div>

      {children}
    </div>
  );
}
