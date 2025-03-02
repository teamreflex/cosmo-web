import { ObjektSidebar } from "@/components/objekt/common";
import { SpinStateComplete, useObjektSpin } from "@/hooks/use-objekt-spin";
import { ObjektBaseFields } from "@/lib/universal/cosmo/objekts";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";

type Props = {
  state: SpinStateComplete;
};

/**
 * Spin has been complete, show all missed options.
 */
export default function StateComplete({ state }: Props) {
  const resetState = useObjektSpin((state) => state.resetState);

  return (
    <div className="flex flex-col gap-2 items-center">
      <div>spin confirmed! here are the options you failed to pick:</div>

      <div className="grid grid-cols-4 gap-2">
        {state.options.map((option, index) =>
          option === null ? (
            <MissedObjekt key={index} index={index} selection={state.index} />
          ) : (
            <OptionObjekt
              key={index}
              index={index}
              selection={state.index}
              objekt={option}
            />
          )
        )}
      </div>

      <button onClick={resetState}>spin again</button>
    </div>
  );
}

type SelectionProps = {
  index: number;
  selection: number;
};

function MissedObjekt({ index, selection }: SelectionProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-accent w-full aspect-photocard touch-manipulation border-2 border-foreground/20 rounded-2xl",
        index === selection && "border-cosmo"
      )}
    >
      <X className="size-8" />
    </div>
  );
}

type OptionProps = SelectionProps & {
  objekt: ObjektBaseFields;
};

function OptionObjekt({ index, selection, objekt }: OptionProps) {
  return (
    <div
      style={{
        "--objekt-background-color": objekt.backgroundColor,
        "--objekt-text-color": objekt.textColor,
      }}
      className={cn(
        "relative bg-accent w-full aspect-photocard object-contain touch-manipulation rounded-2xl",
        index === selection && "border-cosmo"
      )}
    >
      <Image
        src={objekt.frontImage}
        fill={true}
        alt={objekt.collectionId}
        unoptimized
      />

      <ObjektSidebar collection={objekt.collectionNo} />
    </div>
  );
}
