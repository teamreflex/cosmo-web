import { ObjektSidebar } from "@/components/objekt/common";
import { SpinStateComplete, useObjektSpin } from "@/hooks/use-objekt-spin";
import { CosmoSpinOption } from "@/lib/universal/cosmo/spin";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import SpinFail from "@/assets/spin-fail.png";
import { Button } from "@/components/ui/button";
import { IconRotate360 } from "@tabler/icons-react";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  state: SpinStateComplete;
};

/**
 * Spin has been complete. Show result, and optionally all missed options.
 */
export default function StateComplete({ state }: Props) {
  const resetState = useObjektSpin((state) => state.resetState);
  const [open, setOpen] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const isDesktop = useMediaQuery();

  const result = state.options[state.index];

  function onShowOptions() {
    setShowOptions(true);
    setOpen(false);
  }

  function onClose() {
    resetState();
    setOpen(false);
  }

  return (
    <div>
      {showOptions && <SpinOptions state={state} />}

      {isDesktop ? (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Spin Result</DialogTitle>
              <DialogDescription>
                {result?.collectionId ?? "Spin failed"}
              </DialogDescription>
            </DialogHeader>

            <SpinResult
              result={result}
              onShowOptions={onShowOptions}
              onClose={onClose}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onClose}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Spin Result</DrawerTitle>
              <DrawerDescription>
                {result?.collectionId ?? "Spin failed"}
              </DrawerDescription>
            </DrawerHeader>

            <SpinResult
              result={result}
              onShowOptions={onShowOptions}
              onClose={onClose}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

type SpinResultProps = {
  result: CosmoSpinOption;
  onShowOptions: () => void;
  onClose: () => void;
};

function SpinResult({ result, onShowOptions, onClose }: SpinResultProps) {
  const isDesktop = useMediaQuery();

  return (
    <div className="flex flex-col items-center gap-2">
      {/* objekt result */}
      <div className="mx-auto h-72 aspect-photocard">
        {result === null ? (
          <MissedObjekt selected={false} />
        ) : (
          <OptionObjekt selected={false} objekt={result} />
        )}
      </div>

      {/* buttons */}
      <div
        data-mobile={!isDesktop}
        className="flex items-center gap-2 data-mobile:p-4 data-mobile:pb-6"
      >
        <Button variant="secondary" onClick={onShowOptions}>
          <Check className="w-4 h-4 mr-2" />
          <span>Show Options</span>
        </Button>

        <Button onClick={onClose}>
          <span>Close</span>
        </Button>
      </div>
    </div>
  );
}

function SpinOptions({ state }: Props) {
  const resetState = useObjektSpin((state) => state.resetState);

  return (
    <div className="flex flex-col gap-2 items-center">
      <Button onClick={resetState}>
        <IconRotate360 className="w-4 h-4 mr-2" />
        <span>Spin Again</span>
      </Button>

      <div className="grid grid-cols-4 gap-4 w-full lg:grid-cols-8">
        {state.options.map((option, index) =>
          option === null ? (
            <MissedObjekt key={index} selected={index === state.index} />
          ) : (
            <OptionObjekt
              key={index}
              selected={index === state.index}
              objekt={option}
            />
          )
        )}
      </div>
    </div>
  );
}

type SelectionProps = {
  selected: boolean;
};

export function MissedObjekt({ selected }: SelectionProps) {
  return (
    <div
      className={cn(
        "relative aspect-photocard w-full rounded-lg overflow-hidden border-2 border-transparent",
        selected && "border-foreground"
      )}
    >
      <Image
        src={SpinFail.src}
        alt="Spin Fail"
        width={100}
        height={100}
        className="w-full h-full object-cover"
      />

      {selected && <SuccessBadge />}
    </div>
  );
}

type OptionProps = SelectionProps & {
  objekt: NonNullable<CosmoSpinOption>;
};

export function OptionObjekt({ selected, objekt }: OptionProps) {
  return (
    <div
      style={{
        "--objekt-background-color": objekt.backgroundColor,
        "--objekt-text-color": objekt.textColor,
      }}
      className={cn(
        "relative bg-accent w-full aspect-photocard overflow-hidden touch-manipulation rounded-lg border-2 border-transparent",
        selected && "border-cosmo"
      )}
    >
      <Image
        src={objekt.frontImage}
        fill={true}
        alt={objekt.collectionId}
        unoptimized
      />

      <ObjektSidebar collection={objekt.collectionNo} />

      {selected && <SuccessBadge />}
    </div>
  );
}

function SuccessBadge() {
  return (
    <div className="absolute top-1 md:top-2 left-1 md:left-2">
      <div className="flex text-xs font-semibold aspect-square rounded-full size-6 bg-cosmo text-white">
        <Check className="size-4 m-auto" />
      </div>
    </div>
  );
}
