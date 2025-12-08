"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import type { PanInfo } from "motion/react";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: Side;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error("Drawer components must be used within a Drawer");
  }
  return context;
}

interface DrawerProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: Side;
}

function Drawer({
  open,
  onOpenChange,
  side = "bottom",
  children,
  ...props
}: DrawerProps) {
  return (
    <DrawerContext.Provider value={{ open, onOpenChange, side }}>
      <DialogPrimitive.Root data-slot="drawer" open={open} onOpenChange={onOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DrawerContext.Provider>
  );
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />;
}

interface DrawerContentProps
  extends Omit<
    React.ComponentProps<typeof DialogPrimitive.Content>,
    "onAnimationEnd" | "onDragEnd" | "onDrag" | "onDragStart"
  > {
  notch?: boolean;
}

function DrawerContent({
  notch = true,
  children,
  className,
  ...props
}: DrawerContentProps) {
  const { open, onOpenChange, side } = useDrawerContext();

  const getPosition = () => {
    switch (side) {
      case "top":
        return { y: "-100%" };
      case "bottom":
        return { y: "100%" };
      case "left":
        return { x: "-100%" };
      case "right":
        return { x: "100%" };
    }
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const { offset, velocity } = info;

    const shouldClose =
      (side === "bottom" &&
        (velocity.y > 150 || offset.y > window.innerHeight * 0.25)) ||
      (side === "top" &&
        (velocity.y < -150 || offset.y < -window.innerHeight * 0.25)) ||
      (side === "left" &&
        (velocity.x < -150 || offset.x < -window.innerWidth * 0.25)) ||
      (side === "right" &&
        (velocity.x > 150 || offset.x > window.innerWidth * 0.25));

    if (shouldClose) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay forceMount asChild>
            <motion.div
              data-slot="drawer-overlay"
              className="fixed inset-0 z-50 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content forceMount asChild {...props}>
            <motion.div
              data-slot="drawer-content"
              className={cn(
                "fixed z-50 flex touch-none flex-col overflow-hidden bg-background",
                side === "bottom" &&
                  "inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl border-t",
                side === "top" &&
                  "inset-x-0 top-0 max-h-[90vh] rounded-b-2xl border-b",
                side === "left" &&
                  "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r",
                side === "right" &&
                  "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l",
                className,
              )}
              initial={getPosition()}
              animate={{ x: 0, y: 0 }}
              exit={getPosition()}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              drag={side === "left" || side === "right" ? "x" : "y"}
              whileDrag={{ cursor: "grabbing" }}
              dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
              dragElastic={{
                top: side === "top" ? 1 : 0,
                bottom: side === "bottom" ? 1 : 0,
                left: side === "left" ? 1 : 0,
                right: side === "right" ? 1 : 0,
              }}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
              onDragEnd={handleDragEnd}
            >
              {notch && side === "bottom" && (
                <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
              )}
              {children}
              {notch && side === "top" && (
                <div className="mx-auto mb-2.5 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
              )}
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DrawerBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex-1 overflow-auto px-4 py-1", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
};
export type { DrawerProps, DrawerContentProps };
