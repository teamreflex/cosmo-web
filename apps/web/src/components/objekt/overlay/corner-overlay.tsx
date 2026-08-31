import { cn } from "@/lib/utils";
import type { Icon as TablerIcon } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const cornerOverlayVariants = cva(
  "group absolute overflow-hidden bg-(--objekt-background-color) p-1 text-(--objekt-text-color) transition-all sm:p-2",
  {
    variants: {
      corner: {
        "top-left": "top-0 left-0 rounded-br-photocard",
        "top-right": "top-0 right-0 rounded-bl-photocard",
        "bottom-left": "bottom-0 left-0 rounded-tr-photocard",
        "bottom-right": "bottom-0 right-0 rounded-tl-photocard",
      },
      variant: {
        // fixed-height strip: actions on the left, status rail on the right
        bar: "grid h-5 grid-flow-col grid-cols-[1fr_min-content] items-center sm:h-9",
        // free-form: the caller controls sizing and layout via className
        panel: "",
      },
    },
    defaultVariants: {
      corner: "top-left",
      variant: "bar",
    },
  },
);

type CornerOverlayProps = ComponentProps<"div"> &
  VariantProps<typeof cornerOverlayVariants>;

/**
 * Chip anchored to a corner of an objekt card, colored by the objekt's
 * background/text variables. The inner corner is rounded to match the card.
 */
export function CornerOverlay({
  corner,
  variant,
  className,
  ...props
}: CornerOverlayProps) {
  return (
    <div
      {...props}
      className={cn(cornerOverlayVariants({ corner, variant }), className)}
    />
  );
}

/** Icon/button row for a bar overlay's leading column. */
export function OverlayActionRow({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("flex items-center gap-2", className)} />
  );
}

/**
 * Wraps an action-row item so its hover hit area bleeds into the row's gaps
 * (padding offset by negative margin — no visual change). Adjacent targets
 * meet in the middle, so the pointer never crosses a dead zone between them.
 */
export function OverlayHoverTarget({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div {...props} className={cn("-m-1 p-1", className)} />;
}

/**
 * Status text column for a bar overlay: collapsed by default, slides open while the overlay is hovered.
 */
export function OverlayStatusRail({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "max-w-0 overflow-hidden text-xs whitespace-nowrap transition-all group-hover:max-w-48",
        className,
      )}
    />
  );
}

type OverlayIconProps = ComponentProps<TablerIcon> & {
  icon: TablerIcon;
};

/** A Tabler icon sized responsively with the overlay chrome. */
export function OverlayIcon({
  icon: Icon,
  className,
  ...props
}: OverlayIconProps) {
  return (
    <Icon
      {...props}
      className={cn("h-3 w-3 shrink-0 sm:h-5 sm:w-5", className)}
    />
  );
}

/**
 * Icon-sized overlay button with the shared hover-scale affordance. The hit
 * area bleeds into the surrounding gap (padding offset by negative margin) so
 * clicks land wherever the matching OverlayHoverTarget responds to hover.
 */
export function OverlayIconButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "-m-1 flex items-center p-1 transition-all hover:scale-110",
        className,
      )}
    />
  );
}
