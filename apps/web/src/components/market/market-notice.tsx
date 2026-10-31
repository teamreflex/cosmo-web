import {
  ArtWell,
  FeedbackArt,
  MatchesArt,
  SendingArt,
  TransfersArt,
  WantExampleArt,
  type WantKind,
} from "@/components/market/market-notice-art";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDismissNotice } from "@/hooks/use-dismiss-notice";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { dismissedNoticesQuery } from "@/lib/queries/market";
import { cn } from "@/lib/utils";
import { CLAIM_CAP_BASE, CLAIM_CAP_CEILING } from "@apollo/trades/caps";
import { CLAIM_WINDOW, FEEDBACK_WINDOW_DAYS } from "@apollo/trades/timers";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconClock,
  IconLock,
  IconMessageCircle,
  IconProgressCheck,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useRef, useState } from "react";

const STEPS = [TransfersStep, WantStep, MatchesStep, SendingStep, FeedbackStep];

const WANT_KINDS = [
  {
    kind: "range",
    label: m.listing_detail_kind_range,
    body: m.market_notice_want_range,
  },
  {
    kind: "choice",
    label: m.listing_detail_kind_choice,
    body: m.market_notice_want_choice,
  },
  {
    kind: "exact",
    label: m.listing_detail_kind_exact,
    body: m.market_notice_want_exact,
  },
] as const satisfies readonly {
  kind: WantKind;
  label: () => string;
  body: typeof m.market_notice_want_range;
}[];

/**
 * Shown on the market's browsing pages until this browser accepts it: a
 * guide through how trading works, one step at a time. Accepting on the last
 * step is its only way out, and it stays open until the cookie is set. The
 * route loader reads that cookie, so SSR already knows whether it's open.
 */
export default function MarketNotice() {
  const { data: accepted } = useSuspenseQuery({
    ...dismissedNoticesQuery,
    select: (dismissed) => dismissed["market-notice"],
  });
  const mutation = useDismissNotice("market-notice");
  const [step, setStep] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const last = step === STEPS.length - 1;

  return (
    <AlertDialog open={!accepted}>
      <AlertDialogContent
        initialFocus={nextRef}
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-5 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-130"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={m.market_notice_step({ step: i + 1 })}
                aria-current={i === step ? "step" : undefined}
                onClick={() => setStep(i)}
                className="flex-1 cursor-pointer py-1.5"
              >
                <span
                  className={cn(
                    "block h-1 rounded-full",
                    i <= step ? "bg-foreground" : "bg-foreground/15",
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {m.market_notice_progress({ step: step + 1, total: STEPS.length })}
          </p>
        </div>
        {/**
         * Every step shares one grid cell, so the dialog keeps the tallest
         * one's height. Hidden steps also take opacity-0, because children
         * that transition visibility (the tab triggers) would otherwise linger.
         */}
        <div className="grid grid-cols-[minmax(0,1fr)] overflow-y-auto">
          {STEPS.map((Step, i) => (
            <div
              key={i}
              inert={i !== step}
              className={cn(
                "col-start-1 row-start-1 flex flex-col gap-5",
                i !== step && "invisible opacity-0",
              )}
            >
              <Step active={i === step} />
            </div>
          ))}
        </div>
        <AlertDialogFooter className="flex-row justify-between">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="max-sm:h-11"
              onClick={() => {
                setStep(step - 1);
                // Back leaves with the first step, so focus moves on rather than dropping to the page
                if (step === 1) nextRef.current?.focus();
              }}
            >
              {m.common_back()}
            </Button>
          ) : (
            <span />
          )}
          <Button
            ref={nextRef}
            type="button"
            className="min-w-24 max-sm:h-11"
            onClick={() => (last ? mutation.mutate() : setStep(step + 1))}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {last ? m.market_notice_accept() : m.market_notice_next()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type StepProps = {
  active: boolean;
};

/**
 * A step's title and copy under its illustration. Only the active step's
 * title labels the dialog.
 */
function StepText({
  active,
  title,
  children,
}: StepProps & { title: string; children: ReactNode }) {
  const Title = active ? AlertDialogTitle : "h2";
  return (
    <div className="flex flex-col gap-2">
      <Title className="text-lg font-semibold">{title}</Title>
      {children}
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-pretty text-muted-foreground">{children}</p>
  );
}

function Strong({ children }: { children?: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

// a short point with an icon, for the steps that list a few
function Point({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
        {icon}
      </div>
      <Body>{children}</Body>
    </li>
  );
}

function TransfersStep({ active }: StepProps) {
  return (
    <>
      <TransfersArt />
      <StepText active={active} title={m.market_notice_transfers_title()}>
        <Body>{m.market_notice_transfers({ appName: env.VITE_APP_NAME })}</Body>
      </StepText>
      <ul>
        <Point icon={<IconClock />}>{m.market_notice_staff()}</Point>
      </ul>
    </>
  );
}

function WantStep({ active }: StepProps) {
  const [selected, setSelected] = useState<(typeof WANT_KINDS)[number]>(
    WANT_KINDS[0],
  );

  return (
    <Tabs
      value={selected.kind}
      onValueChange={(value) =>
        setSelected(
          (current) =>
            WANT_KINDS.find((want) => want.kind === value) ?? current,
        )
      }
      className="gap-5"
    >
      <ArtWell className="justify-between gap-3 p-3.5">
        <TabsList
          aria-label={m.market_notice_want_kinds()}
          className="w-full max-w-75"
        >
          {WANT_KINDS.map((want) => (
            <TabsTrigger key={want.kind} value={want.kind}>
              {want.label()}
            </TabsTrigger>
          ))}
        </TabsList>
        {WANT_KINDS.map((want) => (
          <TabsContent key={want.kind} value={want.kind}>
            <WantExampleArt kind={want.kind} />
          </TabsContent>
        ))}
      </ArtWell>
      <StepText active={active} title={m.market_notice_want_title()}>
        <Body>
          <ParaglideMessage
            message={selected.body}
            inputs={{}}
            markup={{ b: Strong }}
          />
        </Body>
        <Body>{m.market_notice_want_mix()}</Body>
      </StepText>
    </Tabs>
  );
}

function MatchesStep({ active }: StepProps) {
  return (
    <>
      <MatchesArt />
      <StepText active={active} title={m.market_notice_matches_title()}>
        <Body>
          <ParaglideMessage
            message={m.market_notice_matches}
            inputs={{}}
            markup={{ b: Strong }}
          />
        </Body>
      </StepText>
    </>
  );
}

function SendingStep({ active }: StepProps) {
  return (
    <>
      <SendingArt />
      <StepText
        active={active}
        title={m.market_notice_sending_title({
          hours: CLAIM_WINDOW / 3_600_000,
        })}
      >
        <ul className="flex flex-col gap-2.5">
          <Point icon={<IconMessageCircle />}>
            {m.market_notice_sending_chat()}
          </Point>
          <Point icon={<IconProgressCheck />}>
            {m.market_notice_sending_tracked()}
          </Point>
          <Point icon={<IconLock />}>
            {m.market_notice_sending_locked({ appName: env.VITE_APP_NAME })}
          </Point>
        </ul>
      </StepText>
    </>
  );
}

function FeedbackStep({ active }: StepProps) {
  return (
    <>
      <FeedbackArt />
      <StepText
        active={active}
        title={m.market_notice_feedback_title({ days: FEEDBACK_WINDOW_DAYS })}
      >
        <Body>{m.market_notice_feedback()}</Body>
        <Body>
          {m.market_notice_caps({
            base: CLAIM_CAP_BASE,
            ceiling: CLAIM_CAP_CEILING,
          })}
        </Body>
      </StepText>
    </>
  );
}
