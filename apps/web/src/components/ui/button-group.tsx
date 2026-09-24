import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * First/last children are matched with `:nth-child(1 of :not(…))` rather
 * than `:first-child`/`:last-child`, skipping nodes that aren't group items:
 * a streamed Suspense boundary's `<template id="B:n">` (rendered ahead of its
 * fallback until it resolves), and the hidden focus guards and `aria-owns`
 * span Base UI places around the trigger of an open popover.
 */
const buttonGroupVariants = cva(
  "group/button-group flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          "[&>*:not(:nth-child(1_of_:not(template,[data-base-ui-focus-guard],[aria-owns])))]:rounded-l-none [&>*:not(:nth-child(1_of_:not(template,[data-base-ui-focus-guard],[aria-owns])))]:border-l-0 [&>*:not(:nth-last-child(1_of_:not(template,[data-base-ui-focus-guard],[aria-owns])))]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:nth-child(1_of_:not(template,[data-base-ui-focus-guard],[aria-owns])))]:rounded-t-none [&>*:not(:nth-child(1_of_:not(template,[data-base-ui-focus-guard],[aria-owns])))]:border-t-0 [&>*:not(:nth-last-child(1_of_:not(template,[data-base-ui-focus-guard],[aria-owns])))]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-lg border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        ),
      },
      props,
    ),
    render,
  });
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
