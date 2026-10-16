import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { ratingStyles, roleLabels } from "@/lib/client/feedback";
import { formatSerial } from "@/lib/client/objekt-util";
import { formatCount } from "@/lib/client/trade-listings";
import { itemLabel, tradeTimeFormat } from "@/lib/client/trades";
import { $leaveFeedback } from "@/lib/functions/feedback";
import {
  FEEDBACK_TEXT_MAX,
  normalizeFeedbackText,
  type TradeFeedbackView,
} from "@/lib/universal/feedback";
import { leaveFeedbackSchema } from "@/lib/universal/schema/feedback";
import type { TradeItemView, TradeView } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import {
  type EndedTradeStatus,
  feedbackRatings,
  type TradeSide,
} from "@apollo/database/web/types";
import {
  feedbackDaysLeft,
  feedbackRole,
  feedbackScored,
} from "@apollo/trades/feedback";
import { otherSide } from "@apollo/trades/lifecycle";
import { textLength } from "@apollo/util";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconInfoCircle, IconLoader2, IconLock } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useId, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { bold } from "../notifications/row-utils";
import TradeSheet from "../trade-listings/trade-sheet";
import { EndedBadge } from "../trades/trade-header";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel, FieldSet } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "../ui/input-group";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Timestamp } from "../ui/timestamp";
import RatingIcon from "./rating-icon";
import StarRating from "./star-rating";

/**
 * The rating window the dialog opened on: how and when the trade ended, and
 * when the window closes.
 */
export type FeedbackWindow = Pick<
  Extract<TradeFeedbackView, { state: "open" }>,
  "ended" | "endedAt" | "closesAt"
>;

type Props = {
  trade: TradeView;
  side: TradeSide;
  /** the counterparty as the page names them */
  name: string;
  feedbackWindow: FeedbackWindow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Rates the other party of a trade: positive, neutral or negative, with an
 * optional comment and stars. A centred dialog from tablet width and a
 * drawer below it, with Later and Submit pinned under the form.
 */
export default function FeedbackLeaveDialog({
  trade,
  side,
  name,
  feedbackWindow,
  open,
  onOpenChange,
}: Props) {
  const formId = useId();
  const commentId = useId();
  const firstRating = useRef<HTMLElement>(null);
  const invalidateTrade = useInvalidateTrade(trade.listingId);

  const form = useForm({
    resolver: standardSchemaResolver(leaveFeedbackSchema),
    defaultValues: {
      tradeId: trade.id,
      comment: "",
      communication: null,
      speed: null,
    },
  });

  const mutation = useMutation({
    mutationFn: $leaveFeedback,
    onSuccess: () => {
      toast.success(m.feedback_sent());
      // the mutation still reads as pending here, which handleOpenChange refuses
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  function handleOpenChange(next: boolean) {
    // the rating can't be taken back, so the dialog waits for its answer
    if (mutation.isPending) return;
    onOpenChange(next);
  }

  return (
    <TradeSheet
      title={m.feedback_dialog_title({ name })}
      badge={<EndedBadge status={feedbackWindow.ended} />}
      aside={
        <span className="text-xs text-muted-foreground tabular-nums">
          {m.feedback_days_left({
            count: feedbackDaysLeft(feedbackWindow.closesAt, new Date()),
          })}
        </span>
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11 max-md:flex-1"
            disabled={mutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            {m.feedback_later()}
          </Button>
          <Button
            type="submit"
            form={formId}
            className="max-md:h-11 max-md:flex-1"
            disabled={mutation.isPending}
          >
            <span>{m.feedback_submit()}</span>
            {mutation.isPending && <IconLoader2 className="animate-spin" />}
          </Button>
        </>
      }
      narrow
      initialFocus={firstRating}
      closeDisabled={mutation.isPending}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <TradeContext
        trade={trade}
        side={side}
        ended={feedbackWindow.ended}
        endedAt={feedbackWindow.endedAt}
      />
      <form
        id={formId}
        onSubmit={form.handleSubmit((data) => mutation.mutate({ data }))}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 md:px-5"
      >
        <Controller
          control={form.control}
          name="rating"
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <RadioGroup
                value={field.value ?? null}
                onValueChange={field.onChange}
                aria-label={m.feedback_rating_legend()}
                aria-invalid={fieldState.invalid}
                className="grid-cols-3 gap-2 md:gap-2.5"
              >
                {feedbackRatings.map((rating, i) => (
                  <FieldLabel
                    key={rating}
                    className={cn(
                      "relative flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-border px-2 py-3 font-semibold has-focus-visible:ring-2 has-focus-visible:ring-cosmo/60 md:py-4",
                      fieldState.invalid && "border-destructive",
                      ratingStyles[rating].checked,
                    )}
                  >
                    {/* the first card takes focus on open, and when submitted without a rating */}
                    <RadioGroupItem
                      ref={
                        i === 0
                          ? (element) => {
                              field.ref(element);
                              firstRating.current = element;
                            }
                          : undefined
                      }
                      value={rating}
                      className="absolute top-2.5 right-2.5"
                    />
                    {/* the card's own text names the rating */}
                    <span aria-hidden>
                      <RatingIcon rating={rating} className="size-8" />
                    </span>
                    {ratingStyles[rating].label()}
                  </FieldLabel>
                ))}
              </RadioGroup>
              <FieldError errors={[fieldState.error]} />
            </FieldSet>
          )}
        />
        <Controller
          control={form.control}
          name="comment"
          render={({ field, fieldState }) => {
            const value = field.value ?? "";
            const length = textLength(normalizeFeedbackText(value));
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  htmlFor={commentId}
                  className="text-xxs font-medium tracking-widest text-muted-foreground uppercase"
                >
                  {m.feedback_optional({ label: m.feedback_comment() })}
                </FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    id={commentId}
                    rows={3}
                    placeholder={m.feedback_comment_placeholder()}
                    aria-invalid={fieldState.invalid}
                    className="max-h-40 max-md:text-base"
                    {...field}
                    value={value}
                  />
                  <InputGroupAddon align="block-end">
                    <InputGroupText
                      className={cn(
                        "ml-auto text-xxs tabular-nums",
                        length > FEEDBACK_TEXT_MAX && "text-destructive",
                      )}
                    >
                      {m.chat_length({
                        length: formatCount(length),
                        max: formatCount(FEEDBACK_TEXT_MAX),
                      })}
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError errors={[fieldState.error]} />
              </Field>
            );
          }}
        />
        <div className="flex flex-wrap gap-x-7 gap-y-4">
          {(
            [
              ["communication", m.feedback_communication()],
              ["speed", m.feedback_speed()],
            ] as const
          ).map(([key, label]) => (
            <Controller
              key={key}
              control={form.control}
              name={key}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
                    {m.feedback_optional({ label })}
                  </span>
                  <StarRating
                    label={label}
                    value={field.value ?? null}
                    onChange={field.onChange}
                    disabled={mutation.isPending}
                  />
                </div>
              )}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-input px-3.5 py-3 text-sm text-muted-foreground [&:lang(ko)]:break-keep">
          {!feedbackScored(trade.state) && (
            <p className="flex items-start gap-3">
              <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
              <span>{m.feedback_note_unscored({ name })}</span>
            </p>
          )}
          <p className="flex items-start gap-3">
            <IconLock className="mt-0.5 size-4 shrink-0" />
            <span>{m.feedback_note_final({ name })}</span>
          </p>
        </div>
      </form>
    </TradeSheet>
  );
}

/**
 * How the context line reads each ending: only a completed trade's side was
 * got, and then how and when it ended.
 */
const endings = {
  completed: {
    deal: m.feedback_context_got,
    when: m.feedback_context_completed,
  },
  cancelled: {
    deal: m.feedback_context_due,
    when: m.feedback_context_cancelled,
  },
  timed_out: {
    deal: m.feedback_context_due,
    when: m.feedback_context_timed_out,
  },
};

/**
 * The trade being rated from the viewer's side: what they got for what (or
 * were to get, when it didn't complete), how and when it ended, and the role
 * they rate in.
 */
function TradeContext({
  trade,
  side,
  ended,
  endedAt,
}: {
  trade: TradeView;
  side: TradeSide;
  ended: EndedTradeStatus;
  endedAt: Date;
}) {
  const { deal, when } = endings[ended];
  return (
    <p className="shrink-0 border-b border-border bg-muted/40 px-4 py-3 text-sm text-pretty wrap-anywhere md:px-5 [&:lang(ko)]:break-keep">
      <ParaglideMessage
        message={deal}
        inputs={{ get: "", send: "" }}
        markup={{
          get: () => (
            <b className="font-semibold text-foreground">
              <SideSummary items={trade.items} sender={otherSide(side)} />
            </b>
          ),
          send: () => <SideSummary items={trade.items} sender={side} />,
        }}
      />
      {" · "}
      <ParaglideMessage
        message={when}
        inputs={{ when: "" }}
        markup={{
          time: () => <Timestamp date={endedAt} format={tradeTimeFormat} />,
        }}
      />
      {" · "}
      <ParaglideMessage
        message={m.feedback_context_role}
        inputs={{ role: roleLabels[feedbackRole(trade.state.items, side)]() }}
        markup={bold}
      />
    </p>
  );
}

// what one side sends: the objekt and its serial when it's one, else how many
function SideSummary({
  items,
  sender,
}: {
  items: TradeItemView[];
  sender: TradeSide;
}) {
  const sent = items.filter((item) => item.sender === sender);
  const [only] = sent;
  if (sent.length !== 1 || only === undefined) {
    return m.feedback_context_objekts({ count: sent.length });
  }
  return (
    <>
      {itemLabel(only)}
      {only.serial !== null && (
        <>
          {" "}
          <span className="font-mono tabular-nums">
            {formatSerial(only.serial)}
          </span>
        </>
      )}
    </>
  );
}
