import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] md:has-data-[slot=alert-action]:grid-cols-[1fr_auto] md:has-data-[slot=alert-action]:py-4 md:has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_1fr_auto] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive *:[svg]:text-current",
        success:
          "border-teal-500/40 bg-card text-card-foreground *:[svg]:text-teal-700 dark:*:[svg]:text-teal-500",
        warning:
          "border-amber-500/40 bg-card text-card-foreground *:[svg]:text-amber-700 dark:*:[svg]:text-amber-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The alert's buttons: a row under the text on phones, and from tablet width
 * a last column beside the text, centred on the title's first line. They
 * overflow that line into the alert's padding rather than pushing the title
 * and icon out of line, which suits `sm` buttons.
 */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 max-md:mt-2 max-md:group-has-[>svg]/alert:col-start-2 md:col-start-[-2] md:row-start-1 md:h-[1lh] md:flex-nowrap md:self-start",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
