import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

type TabsVariant = NonNullable<
  VariantProps<typeof tabsListVariants>["variant"]
>;

const TabsVariantContext = React.createContext<TabsVariant>("default");

function Tabs({
  className,
  orientation = "horizontal",
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  variant?: TabsVariant;
}) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
          className,
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default:
          "h-9 w-fit justify-center rounded-sm bg-muted p-0.75 group-data-[orientation=vertical]/tabs:h-fit",
        line: "h-9 w-fit justify-center gap-1 rounded-none bg-transparent p-0.75 group-data-[orientation=vertical]/tabs:h-fit",
        navbar:
          "h-14 w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

const tabsTriggerVariants = cva(
  [
    "relative inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-all",
    "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
    "hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "after:absolute after:opacity-0 after:transition-opacity",
    "group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5",
    "group-data-[orientation=horizontal]/tabs:after:h-0.5",
  ],
  {
    variants: {
      variant: {
        default: [
          "h-[calc(100%-1px)] rounded-sm border border-transparent px-2 py-1 text-foreground/60",
          "focus-visible:border-cosmo/60",
          "data-active:bg-background data-active:text-foreground data-active:shadow-sm",
          "after:bg-foreground group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1.25",
          "dark:text-muted-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        ],
        line: [
          "h-[calc(100%-1px)] rounded-sm border border-transparent px-2 py-1 text-foreground/60",
          "focus-visible:border-cosmo/60",
          "bg-transparent data-active:bg-transparent data-active:text-foreground data-active:shadow-none",
          "after:bg-foreground group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1.25",
          "data-active:after:opacity-100",
          "dark:text-muted-foreground dark:data-active:border-transparent dark:data-active:bg-transparent",
        ],
        navbar: [
          "h-full rounded-none px-4 text-muted-foreground",
          "data-active:text-foreground",
          "after:bg-cosmo group-data-[orientation=horizontal]/tabs:after:inset-x-3 group-data-[orientation=horizontal]/tabs:after:bottom-0",
          "data-active:after:opacity-100",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
