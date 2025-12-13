import { motion } from "motion/react";
import { IconChevronDown } from "@tabler/icons-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import type { ComponentProps, RefObject } from "react";
import { cn } from "@/lib/utils";

interface ExpandableCardProps extends ComponentProps<typeof Card> {}
interface ExpandableCardContentProps extends ComponentProps<
  typeof CardContent
> {}
interface ExpandableCardContextType {
  isExpanded: boolean;
  isOverflowing: boolean;
  toggleExpanded: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  measureOverflow: () => void;
  defaultCollapsedHeight: number;
}

const ExpandableCardContext = createContext<ExpandableCardContextType | null>(
  null,
);

function useExpandableCard() {
  const context = useContext(ExpandableCardContext);
  if (!context) {
    throw new Error(
      "ExpandableCard components must be used within ExpandableCard",
    );
  }
  return context;
}

function ExpandableCard({
  className,
  children,
  ...props
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultCollapsedHeight = 40 * 5 + 1; // 5 rows at 40px + 1px border

  const measureOverflow = useCallback(() => {
    if (!contentRef.current) return;

    // clear any pending measurements
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
    }

    // defer measurement to next frame to ensure DOM is updated
    measureTimeoutRef.current = setTimeout(() => {
      if (!contentRef.current) return;

      const { scrollHeight } = contentRef.current;
      const isCurrentlyOverflowing = scrollHeight > defaultCollapsedHeight;

      setIsOverflowing(isCurrentlyOverflowing);
    }, 0);
  }, [defaultCollapsedHeight]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // measure overflow when content changes or component mounts
  useEffect(() => {
    measureOverflow();

    // cleanup timeout on unmount
    return () => {
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
    };
  }, [measureOverflow, children]);

  // Resize handler - always sees latest measureOverflow
  const handleResize = useEffectEvent(() => measureOverflow());

  // re-measure on window resize
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const contextValue: ExpandableCardContextType = {
    isExpanded,
    isOverflowing,
    toggleExpanded,
    contentRef,
    measureOverflow,
    defaultCollapsedHeight,
  };

  return (
    <ExpandableCardContext.Provider value={contextValue}>
      <Card
        className={cn("relative gap-4 overflow-clip pb-0", className)}
        {...props}
      >
        {children}
      </Card>
    </ExpandableCardContext.Provider>
  );
}

function ExpandableCardHeader(props: ComponentProps<typeof CardHeader>) {
  return <CardHeader {...props} />;
}

function ExpandableCardTitle(props: ComponentProps<typeof CardTitle>) {
  return <CardTitle {...props} />;
}

function ExpandableCardDescription(
  props: ComponentProps<typeof CardDescription>,
) {
  return <CardDescription {...props} />;
}

function ExpandableCardAction(props: ComponentProps<typeof CardAction>) {
  return <CardAction {...props} />;
}

function ExpandableCardContent({
  className,
  children,
  ...props
}: ExpandableCardContentProps) {
  const {
    isExpanded,
    isOverflowing,
    contentRef,
    measureOverflow,
    toggleExpanded,
    defaultCollapsedHeight,
  } = useExpandableCard();

  // re-measure when content changes
  useEffect(() => measureOverflow(), [children, measureOverflow]);

  return (
    <motion.div
      ref={contentRef}
      layout
      initial={false}
      animate={{
        height: isOverflowing
          ? isExpanded
            ? "auto"
            : defaultCollapsedHeight
          : "auto",
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1],
        layout: { duration: 0.3 },
      }}
      className="relative overflow-hidden"
    >
      <CardContent {...props} className={cn("p-0", className)}>
        {children}
      </CardContent>

      {/* Built-in toggle button */}
      {isOverflowing && (
        <div className="absolute right-0 bottom-0 left-0 flex h-8 justify-center bg-gradient-to-t from-black/25 to-transparent">
          <button
            data-expanded={isExpanded}
            onClick={toggleExpanded}
            className={cn(
              "group flex w-full items-center justify-center gap-2 text-xs text-background focus:outline-none dark:text-foreground",
            )}
          >
            <IconChevronDown className="size-4 transition-transform group-data-[expanded=true]:rotate-180" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ExpandableCardFooter(props: ComponentProps<typeof CardFooter>) {
  return <CardFooter {...props} />;
}

export {
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardTitle,
  ExpandableCardDescription,
  ExpandableCardAction,
  ExpandableCardContent,
  ExpandableCardFooter,
  useExpandableCard,
};
