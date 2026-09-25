import { cn } from "@/lib/utils";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import * as React from "react";

type Side = "top" | "bottom" | "left" | "right";

const swipeDirections = {
  top: "up",
  bottom: "down",
  left: "left",
  right: "right",
} as const;

const DrawerContext = React.createContext<{ side: Side; modal: boolean }>({
  side: "bottom",
  modal: true,
});

type DrawerProps = Omit<DrawerPrimitive.Root.Props, "swipeDirection"> & {
  side?: Side;
};

function Drawer({ side = "bottom", modal = true, ...props }: DrawerProps) {
  return (
    <DrawerContext.Provider value={{ side, modal: modal === true }}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        swipeDirection={swipeDirections[side]}
        modal={modal}
        {...props}
      />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

type DrawerContentProps = DrawerPrimitive.Popup.Props & {
  notch?: boolean;
};

/**
 * The sliding panel. Swipe movement arrives as CSS variables on the popup, so
 * the whole gesture and its release run as compositor transforms.
 */
function DrawerContent({
  notch = true,
  children,
  className,
  ...props
}: DrawerContentProps) {
  const { side, modal } = React.useContext(DrawerContext);

  return (
    <DrawerPrimitive.Portal>
      {modal && (
        <DrawerPrimitive.Backdrop
          data-slot="drawer-overlay"
          className="fixed inset-0 z-50 bg-black/50 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0"
        />
      )}
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className={cn("fixed inset-0 z-50", !modal && "pointer-events-none")}
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          data-side={side}
          className={cn(
            "pointer-events-auto fixed z-50 flex flex-col overflow-hidden bg-background outline-none",
            "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[90vh] translate-y-(--drawer-swipe-movement-y) rounded-t-2xl border-t data-ending-style:translate-y-full data-starting-style:translate-y-full",
            side === "top" &&
              "inset-x-0 top-0 max-h-[90vh] translate-y-(--drawer-swipe-movement-y) rounded-b-2xl border-b data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
            side === "left" &&
              "inset-y-0 left-0 h-full w-3/4 max-w-sm translate-x-(--drawer-swipe-movement-x) border-r data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
            side === "right" &&
              "inset-y-0 right-0 h-full w-3/4 max-w-sm translate-x-(--drawer-swipe-movement-x) border-l data-ending-style:translate-x-full data-starting-style:translate-x-full",
            className,
          )}
          {...props}
        >
          {notch && side === "bottom" && (
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
          )}
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className="flex min-h-0 flex-1 flex-col overscroll-contain"
          >
            {children}
          </DrawerPrimitive.Content>
          {notch && side === "top" && (
            <div className="mx-auto mb-2.5 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1.5 p-4 text-center sm:text-left",
        className,
      )}
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

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
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
