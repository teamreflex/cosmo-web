import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

const badgeVariants = cva(
  "h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // misc
        twitter: "bg-twitter text-white hover:bg-twitter/90",
        discord: "bg-discord text-white hover:bg-discord/90",
        cosmo: "bg-cosmo text-white hover:bg-cosmo/90",
        // gravity
        "event-gravity": "border-transparent bg-teal-200 text-teal-700",
        "grand-gravity": "border-transparent bg-pink-300 text-pink-700",
        "gravity-starts": "border-transparent bg-blue-200 text-gravity-starts",
        "gravity-voting": "border-transparent bg-cosmo/20 text-gravity-voting",
        "gravity-counting":
          "border-transparent bg-amber-200 text-gravity-counting",
        // event system
        "event-era":
          "shadow-xs border-foreground/30 text-foreground backdrop-blur-sm transform-gpu bg-foreground/10 firefox:backdrop-blur-none",
        // objekt seasons
        "season-atom":
          "shadow-xs border-atom/50 text-atom backdrop-blur-sm bg-atom/20 firefox:backdrop-blur-none",
        "season-binary":
          "shadow-xs border-binary/50 text-binary backdrop-blur-sm bg-binary/20 firefox:backdrop-blur-none",
        "season-cream":
          "shadow-xs border-cream/50 text-cream backdrop-blur-sm bg-cream/20 firefox:backdrop-blur-none",
        "season-divine":
          "shadow-xs border-divine/50 text-divine backdrop-blur-sm bg-divine/20 firefox:backdrop-blur-none",
        "season-ever":
          "shadow-xs border-ever/50 text-ever backdrop-blur-sm bg-ever/20 firefox:backdrop-blur-none",
        "season-summer":
          "shadow-xs border-summer/50 text-summer backdrop-blur-sm bg-summer/20 firefox:backdrop-blur-none",
        "season-autumn":
          "shadow-xs border-autumn/50 text-autumn backdrop-blur-sm bg-autumn/20 firefox:backdrop-blur-none",
        "season-winter":
          "shadow-xs border-winter/50 text-winter backdrop-blur-sm bg-winter/20 firefox:backdrop-blur-none",
        "season-spring":
          "shadow-xs border-spring/50 text-spring backdrop-blur-sm bg-spring/20 firefox:backdrop-blur-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
