import { useArtists } from "@/hooks/use-artists";
import { useDismissNotice } from "@/hooks/use-dismiss-notice";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import {
  collectionShown,
  type ComposerDisplay,
  emptyComposerDisplay,
  formatAmount,
  joinOptions,
  listingComposerDisplay,
  withPayment,
} from "@/lib/client/trade-listings";
import { $editListing, $postListing } from "@/lib/functions/trade-listings";
import { dismissedNoticesQuery } from "@/lib/queries/market";
import {
  offeredTokenRefusalsQuery,
  rangeMatchCountQuery,
  tradeListingKey,
  tradeListingQuery,
} from "@/lib/queries/trade-listings";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import {
  claimerAmounts,
  composerBlock,
  type ComposerMode,
  dirtyOptions,
  emptyListingForm,
  followMaxUnits,
  followUnitSize,
  formUnitSize,
  formValuesToInput,
  hasFormPayment,
  type ListingFormValues,
  type ListingSubmission,
  listingToFormValues,
  offersOpen,
  parsedRanges,
  paymentPricing,
  stepUnitSize,
} from "@/lib/universal/trade-listing-form";
import {
  acceptanceOf,
  type TokenRefusalReason,
} from "@/lib/universal/trade-listings";
import { track } from "@/lib/utils";
import type { ListingOfferMode } from "@apollo/database/web/types";
import { MAX_NOTE_LENGTH, MAX_OFFERED } from "@apollo/trades/caps";
import { totalWanted } from "@apollo/trades/composer";
import {
  type ListingInput,
  listingInputSchema,
  paymentTakesOffers,
} from "@apollo/trades/listing";
import { amountSchema } from "@apollo/trades/payment";
import { MAX_RANGE_VALUES } from "@apollo/trades/range";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useId, useRef, useState } from "react";
import {
  Controller,
  useForm,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import ResponsiveSheet from "../responsive-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import ComposerBuyUnits from "./composer-buy-units";
import ComposerOffered from "./composer-offered";
import {
  ComposerOfferedPayment,
  ComposerOfferedPaymentButton,
  ComposerPaymentStrip,
} from "./composer-payment";
import ComposerRangeConfirm from "./composer-range-confirm";
import ComposerRatio from "./composer-ratio";
import ComposerOptions from "./composer-want-rows";
import TradePicker from "./trade-picker";

type Props = {
  mode: ComposerMode;
  /** the poster's linked COSMO address, whose collection the picker lists */
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Posts a trade listing, or replaces the terms of the poster's open one: the
 * objekts it offers, the rows it asks for, the ratio between them and a
 * note. A centred dialog on desktop and a tall bottom drawer on phones; the
 * form lives above that switch, so crossing the breakpoint keeps everything
 * entered.
 */
export default function ListingComposer({
  mode,
  address,
  open,
  onOpenChange,
}: Props) {
  const isDesktop = useMediaQuery();
  const queryClient = useQueryClient();
  const editedListing = mode.kind === "edit" ? mode.listing.id : undefined;
  const invalidateListings = useInvalidateListing();
  const navigate = useNavigate();
  const initialValues = () =>
    mode.kind === "edit" ? listingToFormValues(mode.listing) : emptyListingForm;
  const initialDisplay = () =>
    mode.kind === "edit"
      ? listingComposerDisplay(mode.listing)
      : emptyComposerDisplay;

  const form = useForm<ListingFormValues, unknown, ListingInput>({
    resolver: standardSchemaResolver(listingInputSchema),
    defaultValues: initialValues(),
    mode: "onTouched",
  });
  const [view, setView] = useState<"form" | "picker">("form");
  const offering = useOfferedRefusals(form, editedListing, view === "form");
  const [display, setDisplay] = useState<ComposerDisplay>(initialDisplay);
  const [discarding, setDiscarding] = useState(false);
  // a submission waiting for the poster to confirm the listing takes offers
  const [held, setHeld] = useState<{
    submission: ListingSubmission;
    // some option claims at once, so not the whole listing waits for offers
    mixed: boolean;
  } | null>(null);
  // read during render so the form keeps it current for requestClose
  const { isDirty } = form.formState;
  // a double click posts once, even before the pending state renders
  const submitting = useRef(false);
  const { data: rangeNoticeDismissed } = useSuspenseQuery({
    ...dismissedNoticesQuery,
    select: (dismissed) => dismissed["range-offers-notice"],
  });
  const { artistList } = useArtists();
  const { currency: displayCurrency } = useDisplayCurrency();
  const currency =
    useWatch({ control: form.control, name: "payment.currency" }) ??
    displayCurrency;
  // each artist's members, keyed as ranges store artists
  const rosters = new Map(
    artistList.map((artist) => [
      artist.id.toLowerCase(),
      artist.artistMembers.map((member) => member.name),
    ]),
  );

  const mutation = useMutation({
    mutationFn: (submission: ListingSubmission) =>
      submission.kind === "create"
        ? $postListing({ data: submission.data })
        : $editListing({ data: submission.data }),
    onSuccess: (result) => {
      if (result.kind === "token_unavailable") {
        const shown = display.tokens.get(result.tokenId);
        const message = formatTokenRefusal(result.reason, {
          objekt: shown?.name ?? "",
          serial: shown?.serial ?? 0,
        });
        form.setError("offered", { message });
        toast.error(message);
        void queryClient.invalidateQueries({ queryKey: tradeListingKey });
        return;
      }

      if (mode.kind === "create") {
        track("post-listing");
        toast.success(m.listing_composer_posted(), {
          action: {
            label: m.listing_composer_view(),
            onClick: () =>
              void navigate({
                to: "/market/listing/$id",
                params: { id: result.listingId },
              }),
          },
        });
      } else {
        toast.success(m.listing_composer_saved());
      }
      onOpenChange(false);
      void invalidateListings();
    },
    onError: (error) => {
      if (isRateLimitErrorCode(error.message)) {
        toast.error(m.listing_composer_rate_limited_title(), {
          description: m.listing_composer_rate_limited_description(),
        });
        return;
      }

      toast.error(formatError(error));
      // the listing moved on while the dialog was open, so its terms are gone
      if (
        mode.kind === "edit" &&
        (error.message === "listing_closed" ||
          error.message === "listing_not_found")
      ) {
        onOpenChange(false);
        void invalidateListings();
      }
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const dismissRangeNotice = useDismissNotice("range-offers-notice");

  /**
   * Escape, a click outside, a swipe, Close and Cancel all land here: a
   * form with anything entered asks before throwing it away, and nothing
   * closes while a post or save is in flight.
   */
  function requestClose(next: boolean) {
    if (!next && mutation.isPending) return;
    if (!next && isDirty) setDiscarding(true);
    else onOpenChange(next);
  }

  // clearing once the close animation ends keeps the closing form intact
  function handleOpenChangeComplete(next: boolean) {
    if (next) return;
    // the offered check may have found an objekt the page still shows as fine
    if (mode.kind === "edit") {
      void queryClient.invalidateQueries({
        queryKey: tradeListingQuery(mode.listing.id).queryKey,
      });
    }
    form.reset(initialValues());
    mutation.reset();
    setView("form");
    setDisplay(initialDisplay());
  }

  /**
   * A bundle keeps taking the whole pool, and a ratio is held to a smaller
   * one; with no objekts left, the poster's payment buys.
   */
  function setOffered(offered: ListingFormValues["offered"]) {
    form.setValue(
      "unitSize",
      followUnitSize(form.getValues("unitSize"), offered.length),
      dirtyOptions(form),
    );
    form.setValue("offered", offered, dirtyOptions(form));
    syncMaxUnits();
  }

  // a payment with no objekts buys, and anything else buys nothing, so the poster's payment on top goes back to a fixed price
  function syncMaxUnits() {
    form.setValue(
      "maxUnits",
      followMaxUnits(form.getValues("maxUnits"), form.getValues()),
      dirtyOptions(form),
    );
    if (!paymentTakesOffers(form.getValues()) && openToOffers()) {
      setPaymentPricing(false);
    }
  }

  function toggleOffered({ collection, objekt: token }: Objekt.Objekt) {
    const { tokenId } = token;
    const offered = form.getValues("offered");

    if (offered.some((item) => item.tokenId === tokenId)) {
      setOffered(offered.filter((item) => item.tokenId !== tokenId));
      return;
    }
    if (offered.length >= MAX_OFFERED) return;

    setDisplay((current) => ({
      ...current,
      tokens: new Map(current.tokens).set(tokenId, {
        ...collectionShown(collection),
        serial: token.serial,
      }),
    }));
    setOffered([...offered, { tokenId }]);
  }

  // whether the payment takes offers, read as a handler runs so typing an amount doesn't re-render the form
  function openToOffers() {
    return offersOpen(form.getValues("payment")?.mode);
  }

  // a payment on either side needs the listing's currency and methods
  function addPaymentTerms() {
    if (form.getValues("payment") === undefined) {
      form.setValue(
        "payment",
        { currency: displayCurrency, methods: [] },
        dirtyOptions(form),
      );
    }
  }

  /**
   * The payment's amounts and the listing's offer mode change together:
   * `typed` is the amount just typed in the poster's payment or an
   * option's payment row, if any, and every amount and the mode follow
   * from all of them.
   */
  function setPaymentPricing(
    open: boolean,
    typed?:
      | { side: "from"; amount: string }
      | { side: "to"; option: number; amount: string },
  ) {
    const offered = form.getValues("offeredPayment");
    const rows =
      offered !== undefined
        ? [
            {
              amount:
                typed?.side === "from" ? typed.amount : (offered.amount ?? ""),
              write: (amount: string | undefined) =>
                form.setValue(
                  "offeredPayment",
                  amount === undefined ? {} : { amount },
                  dirtyOptions(form),
                ),
            },
          ]
        : form.getValues("options").flatMap((wants, option) => {
            const index = wants.findIndex((want) => want.kind === "payment");
            const row = wants[index];
            return row?.kind === "payment"
              ? [
                  {
                    amount:
                      typed?.side === "to" && typed.option === option
                        ? typed.amount
                        : (row.amount ?? ""),
                    write: (amount: string | undefined) =>
                      form.setValue(
                        `options.${option}.${index}`,
                        { kind: "payment", amount },
                        dirtyOptions(form),
                      ),
                  },
                ]
              : [];
          });
    const terms = paymentPricing(
      rows.map((row) => row.amount),
      open,
    );
    rows.forEach((row, position) => row.write(terms.amounts[position]));
    form.setValue("payment.mode", terms.mode, dirtyOptions(form));
  }

  // with no payment left on either side, the terms go too
  function dropUnusedPaymentTerms() {
    if (!hasFormPayment(form.getValues())) {
      form.setValue("payment", undefined, dirtyOptions(form));
    }
  }

  function post(submission: ListingSubmission) {
    if (submitting.current) return;
    submitting.current = true;
    mutation.mutate(submission);
  }

  function submit(values: ListingInput) {
    const submission = formValuesToInput(values, mode, rosters);
    // confirm first when this post adds the listing's first range row, which makes it take offers
    if (
      !rangeNoticeDismissed &&
      hasRangeRow(submission.data.options.flat()) &&
      (mode.kind === "create" ||
        !hasRangeRow(mode.listing.options.flatMap((option) => option.wants)))
    ) {
      setHeld({
        submission,
        mixed: values.options.some(
          (option) => acceptanceOf(option) !== "offer",
        ),
      });
    } else {
      post(submission);
    }
  }

  function confirmRange(dismiss: boolean) {
    if (held === null) return;
    setHeld(null);
    if (dismiss) dismissRangeNotice.mutate();
    post(held.submission);
  }

  const title =
    mode.kind === "create"
      ? m.listing_composer_title_create()
      : m.listing_composer_title_edit();

  const shell = (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="flex min-h-0 flex-1 flex-col"
    >
      {view === "picker" ? (
        <PickerView
          form={form}
          address={address}
          editedListing={editedListing}
          onToggle={toggleOffered}
          onBack={() => setView("form")}
        />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="border-b border-border lg:border-r lg:border-b-0">
                <OfferedSection
                  form={form}
                  display={display}
                  offering={offering}
                  onAdd={() => setView("picker")}
                  onChange={setOffered}
                  onAddPayment={() => {
                    form.setValue(
                      "offeredPayment",
                      { amount: "" },
                      dirtyOptions(form),
                    );
                    addPaymentTerms();
                    syncMaxUnits();
                  }}
                />
                <OfferedPayment
                  form={form}
                  currency={currency}
                  onAmount={(amount) =>
                    setPaymentPricing(openToOffers(), { side: "from", amount })
                  }
                  onRemove={() => {
                    form.setValue(
                      "offeredPayment",
                      undefined,
                      dirtyOptions(form),
                    );
                    dropUnusedPaymentTerms();
                    syncMaxUnits();
                  }}
                />
              </div>
              <ComposerOptions
                form={form}
                display={display}
                currency={currency}
                onPaymentAdded={() => {
                  // a new row joins the listing's offer mode, as its others hold it
                  if (form.getValues("payment") === undefined) {
                    addPaymentTerms();
                  } else {
                    setPaymentPricing(openToOffers());
                  }
                }}
                onPaymentRemoved={() => {
                  dropUnusedPaymentTerms();
                  if (form.getValues("payment") !== undefined) {
                    setPaymentPricing(openToOffers());
                  }
                }}
                onPaymentAmount={(option, amount) =>
                  setPaymentPricing(openToOffers(), {
                    side: "to",
                    option,
                    amount,
                  })
                }
                onCollection={(collection) =>
                  setDisplay((current) => ({
                    ...current,
                    collections: new Map(current.collections).set(
                      collection.slug,
                      collectionShown(collection),
                    ),
                  }))
                }
              />
            </div>
            <PaymentStrip
              form={form}
              onOffers={(open) => setPaymentPricing(open)}
            />
            <RatioStrip form={form} currency={currency} />
            <BuyStrip form={form} />
            <NoteStrip form={form} />
          </div>
          <ComposerFooter
            form={form}
            mode={mode}
            currency={currency}
            rosters={rosters}
            offering={offering}
            pending={mutation.isPending}
            cancel={
              isDesktop ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => requestClose(false)}
                >
                  {m.common_cancel()}
                </Button>
              ) : null
            }
          />
        </>
      )}
      <DiscardDialog
        mode={mode}
        open={discarding}
        pending={mutation.isPending}
        onOpenChange={setDiscarding}
        onDiscard={() => onOpenChange(false)}
      />
      <ComposerRangeConfirm
        mode={mode}
        open={held !== null}
        mixed={held?.mixed ?? false}
        onOpenChange={() => setHeld(null)}
        onContinue={confirmRange}
      />
    </form>
  );

  return (
    <ResponsiveSheet
      title={title}
      closeDisabled={mutation.isPending}
      open={open}
      onOpenChange={requestClose}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      {shell}
    </ResponsiveSheet>
  );
}

/**
 * Asks before closing the composer throws away what the poster entered.
 */
function DiscardDialog({
  mode,
  open,
  pending,
  onOpenChange,
  onDiscard,
}: {
  mode: ComposerMode;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode.kind === "create"
              ? m.listing_composer_discard_title_create()
              : m.listing_composer_discard_title_edit()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.listing_composer_discard_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {m.listing_composer_discard_keep()}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onDiscard}
          >
            {m.listing_composer_discard_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type FormProps = {
  form: UseFormReturn<ListingFormValues, unknown, ListingInput>;
};

function OfferedSection({
  form,
  display,
  offering: { offered, tokenIds, refusals },
  onAdd,
  onChange,
  onAddPayment,
}: FormProps & {
  display: ComposerDisplay;
  offering: ReturnType<typeof useOfferedRefusals>;
  onAdd: () => void;
  onChange: (offered: ListingFormValues["offered"]) => void;
  onAddPayment: () => void;
}) {
  const [options, offeredPayment] = useWatch({
    control: form.control,
    name: ["options", "offeredPayment"],
  });
  return (
    <ComposerOffered
      action={
        offeredPayment === undefined && (
          <ComposerOfferedPaymentButton
            disabled={claimerAmounts(options).length > 0}
            onAdd={onAddPayment}
          />
        )
      }
      tokenIds={tokenIds}
      tokens={display.tokens}
      refusals={refusals}
      error={form.formState.errors.offered?.message}
      onAdd={onAdd}
      onRemove={(tokenId) =>
        onChange(offered.filter((item) => item.tokenId !== tokenId))
      }
    />
  );
}

/**
 * The poster's payment, once added: on top of their objekts, or alone,
 * which buys and may take offers, when an empty amount asks for no price.
 */
function OfferedPayment({
  form,
  currency,
  onAmount,
  onRemove,
}: FormProps & {
  currency: string;
  onAmount: (amount: string) => void;
  onRemove: () => void;
}) {
  const [offeredPayment, maxUnits, mode] = useWatch({
    control: form.control,
    name: ["offeredPayment", "maxUnits", "payment.mode"],
  });

  return (
    offeredPayment !== undefined && (
      <div className="flex flex-col px-4 pb-4 md:px-5">
        <ComposerOfferedPayment
          paying={maxUnits !== undefined}
          currency={currency}
          amount={offeredPayment.amount ?? ""}
          offers={offersOpen(mode)}
          onChange={onAmount}
          onRemove={onRemove}
        />
      </div>
    )
  );
}

/**
 * The listing's payment terms (ComposerPaymentStrip), once either side has a payment. The poster's payment on top of their objekts is a fixed price, so the offers control shows only while the claimer pays or the listing buys (paymentTakesOffers()).
 */
function PaymentStrip({
  form,
  onOffers,
}: FormProps & { onOffers: (open: boolean) => void }) {
  const [terms, offeredPayment, maxUnits] = useWatch({
    control: form.control,
    name: ["payment", "offeredPayment", "maxUnits"],
  });

  return (
    terms !== undefined && (
      <ComposerPaymentStrip
        currency={terms.currency}
        methods={terms.methods}
        paying={offeredPayment !== undefined}
        offers={
          paymentTakesOffers({ offeredPayment, maxUnits })
            ? {
                open: offersOpen(terms.mode),
                onChange: onOffers,
              }
            : null
        }
        onCurrency={(next) =>
          form.setValue("payment.currency", next, dirtyOptions(form))
        }
        onMethods={(next) =>
          form.setValue("payment.methods", next, dirtyOptions(form))
        }
      />
    )
  );
}

/**
 * What one trade asks for, as the ratio shows it: each option's phrase (optionPhrases()) with its objekts as a bare count, the options joined by "or". Null means every option asks for nothing but an offer.
 */
function wantedText(options: ListingFormValues["options"], currency: string) {
  const phrases = optionPhrases(options, currency, (count) => String(count));
  return phrases.length === 0 ? null : joinOptions(phrases);
}

/**
 * Each option as a phrase: its objekts as countText words them, plus the claimer's payment in the listing's currency once its amount reads, "2 + $3.00", or the payment alone. An option asking for nothing but an offer has no phrase.
 */
function optionPhrases(
  options: ListingFormValues["options"],
  currency: string,
  countText: (count: number) => string,
) {
  return options.flatMap((wants) => {
    const wanted = totalWanted(wants);
    const row = wants.find((want) => want.kind === "payment");
    if (row === undefined) return [countText(wanted)];
    if (row.amount === undefined)
      return wanted === 0 ? [] : [countText(wanted)];
    const price = priceText(row.amount, currency);
    return [wanted === 0 ? price : withPayment(countText(wanted), price)];
  });
}

/**
 * The ratio, once the want rows ask for something and there are two or
 * more objekts to split it over, or an edit's ratio takes more than the
 * pool holds, so the poster can lower it. A listing with no asking price,
 * or with several options, shows only the poster's side.
 */
function RatioStrip({ form, currency }: FormProps & { currency: string }) {
  const [offered, unitSize, options] = useWatch({
    control: form.control,
    name: ["offered", "unitSize", "options"],
  });
  const over = unitSize !== undefined && unitSize > offered.length;
  const wanted = wantedText(options, currency);

  return options.every((wants) => wants.length === 0) ||
    (offered.length < 2 && !over) ? null : (
    <ComposerRatio
      unitSize={formUnitSize({ offered, unitSize })}
      bundle={unitSize === undefined}
      offered={offered.length}
      want={
        // several options trade at several ratios, so only the poster's side shows
        wanted === null || options.length > 1
          ? { kind: "offers" }
          : {
              kind: options.every((wants) =>
                wants.every((want) => want.kind === "payment"),
              )
                ? "price"
                : "objekts",
              text: wanted,
            }
      }
      onChange={(next) =>
        form.setValue(
          "unitSize",
          stepUnitSize(next, offered.length),
          dirtyOptions(form),
        )
      }
    />
  );
}

/**
 * How many units a buy listing pays for, once the poster's payment stands
 * alone.
 */
function BuyStrip({ form }: FormProps) {
  const maxUnits = useWatch({ control: form.control, name: "maxUnits" });

  return (
    maxUnits !== undefined && (
      <ComposerBuyUnits
        maxUnits={maxUnits}
        onChange={(next) => form.setValue("maxUnits", next, dirtyOptions(form))}
      />
    )
  );
}

const noRefusals: ReadonlyMap<number, TokenRefusalReason> = new Map();

/**
 * The offered objekts and why the server refuses any of them, for the offered
 * section and the footer. Adding or removing an objekt asks again, and the
 * last answer stands until the new one arrives, so a refused objekt stays
 * marked and the footer stays blocked. The composer calls it once and keeps
 * it through a trip to the picker, which asks nothing until the form is back.
 */
function useOfferedRefusals(
  form: FormProps["form"],
  editedListing: string | undefined,
  active: boolean,
) {
  const offered = useWatch({ control: form.control, name: "offered" });
  const tokenIds = offered.map((item) => item.tokenId);
  const { data: refusals = noRefusals } = useQuery({
    ...offeredTokenRefusalsQuery(tokenIds, editedListing),
    enabled: active && tokenIds.length > 0,
    placeholderData: keepPreviousData,
  });
  return { offered, tokenIds, refusals };
}

function PickerView({
  form,
  address,
  editedListing,
  onToggle,
  onBack,
}: FormProps & {
  address: string;
  editedListing: string | undefined;
  onToggle: (objekt: Objekt.Objekt) => void;
  onBack: () => void;
}) {
  const offered = useWatch({ control: form.control, name: "offered" });

  return (
    <TradePicker
      address={address}
      heading={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <IconArrowLeft />
            {m.common_back()}
          </Button>
          <span className="text-sm font-semibold">
            {m.listing_composer_add_objekts()}
          </span>
        </>
      }
      picked={new Set(offered.map((item) => item.tokenId))}
      full={offered.length >= MAX_OFFERED}
      editedListing={editedListing}
      pickedLabel={m.listing_composer_pill_offering()}
      onToggle={onToggle}
      onDone={onBack}
    />
  );
}

/**
 * The optional note.
 */
function NoteStrip({ form }: FormProps) {
  const noteId = useId();

  return (
    <div className="border-t border-border bg-muted/40 px-4 py-3.5 md:px-5">
      <Controller
        control={form.control}
        name="note"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1">
            <FieldLabel
              htmlFor={noteId}
              className="text-xxs font-medium tracking-widest text-muted-foreground uppercase"
            >
              {m.listing_composer_note()}
            </FieldLabel>
            <Textarea
              id={noteId}
              rows={2}
              dir="auto"
              placeholder={m.listing_composer_note_placeholder()}
              aria-invalid={fieldState.invalid}
              className="min-h-10 resize-none"
              {...field}
              value={field.value ?? ""}
            />
            <div className="flex items-start gap-2">
              {/* the schema's message is English, and length is the only refusal typing reaches */}
              <FieldError className="text-xs">
                {fieldState.invalid
                  ? m.listing_composer_reason_note({ max: MAX_NOTE_LENGTH })
                  : null}
              </FieldError>
              <span
                className={
                  (field.value?.length ?? 0) > MAX_NOTE_LENGTH
                    ? "ml-auto font-mono text-xs text-destructive tabular-nums"
                    : "ml-auto font-mono text-xs text-muted-foreground tabular-nums"
                }
              >
                {field.value?.length ?? 0} / {MAX_NOTE_LENGTH}
              </span>
            </div>
          </Field>
        )}
      />
    </div>
  );
}

/**
 * One trade at a glance, the ratio's two sides, why posting is held back
 * when it is, and the buttons. On phones the footer stays pinned under the
 * scrolling form.
 */
function ComposerFooter({
  form,
  mode,
  currency,
  rosters,
  offering: { offered, tokenIds, refusals },
  pending,
  cancel,
}: FormProps & {
  mode: ComposerMode;
  currency: string;
  rosters: ReadonlyMap<string, readonly string[]>;
  offering: ReturnType<typeof useOfferedRefusals>;
  pending: boolean;
  cancel: ReactNode;
}) {
  const reasonId = useId();
  const [unitSize, maxUnits, options, offeredPayment, payment, note] = useWatch(
    {
      control: form.control,
      name: [
        "unitSize",
        "maxUnits",
        "options",
        "offeredPayment",
        "payment",
        "note",
      ],
    },
  );
  // the range rows count their own matches, keyed as the schema reads them; this reads the counts they cached
  const rangeMatches = useQueries({
    queries: options.flat().flatMap((want) => {
      const ranges = want.kind === "range" ? parsedRanges(want.ranges) : null;
      return ranges === null
        ? []
        : [{ ...rangeMatchCountQuery(ranges), enabled: false }];
    }),
    combine: (results) => results.map((result) => result.data),
  });
  const reason = blockedReason(
    composerBlock({
      offered: offered.length,
      refused: tokenIds.filter((tokenId) => refusals.has(tokenId)).length,
      options,
      offeredPayment,
      payment,
      unitSize,
      maxUnits,
      rangeMatches,
      rosters,
      note: note ?? "",
    }),
    {
      unitSize: formUnitSize({ offered, unitSize }),
      offered: offered.length,
      emptyOption: options.findIndex((wants) => wants.length === 0) + 1,
    },
  );

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:px-5 md:py-3.5">
      <span className="text-center text-xs text-muted-foreground tabular-nums md:text-left">
        {footerSummary(
          // a buy listing's side is its payment alone, or an offer with no asking price
          maxUnits !== undefined && offeredPayment !== undefined
            ? offeredPayment.amount === undefined
              ? m.listing_payment_offer()
              : priceText(offeredPayment.amount, currency)
            : withPrice(
                m.listing_composer_footer_offered({
                  count: formUnitSize({ offered, unitSize }),
                }),
                offeredPayment?.amount,
                currency,
              ),
          options,
          payment?.mode,
          currency,
        )}
      </span>
      {reason !== null && (
        <span
          id={reasonId}
          className="text-center text-xs text-amber-700 md:text-left dark:text-amber-500"
        >
          {reason}
        </span>
      )}
      <div className="flex gap-2 md:ml-auto">
        {cancel}
        <Button
          type="submit"
          disabled={reason !== null || pending}
          aria-describedby={reason === null ? undefined : reasonId}
          className="max-md:h-11 max-md:flex-1"
        >
          {mode.kind === "create"
            ? m.listing_composer_post()
            : m.listing_composer_save()}
          {pending && <Spinner />}
        </Button>
      </div>
    </div>
  );
}

// a range row makes a listing take offers, which the range notice explains
function hasRangeRow(wants: readonly { kind: string }[]) {
  return wants.some((want) => want.kind === "range");
}

// an amount as typed, in the listing's currency once it reads, else "…"
function priceText(amount: string, currency: string) {
  const parsed = amountSchema.safeParse(amount);
  return parsed.success ? formatAmount(parsed.data, currency) : "…";
}

// a side of the summary with its payment added, "1 objekt + $3.00"
function withPrice(text: string, amount: string | undefined, currency: string) {
  return amount === undefined
    ? text
    : withPayment(text, priceText(amount, currency));
}

/**
 * One trade at a glance in the footer, "1 objekt ⇄ $3.00": each option's
 * objekts, payment or both, joined by "or", with "open to offers" when
 * the listing takes offers beside its prices. A listing with no asking
 * price reads as the poster's side taking offers.
 */
function footerSummary(
  offered: string,
  options: ListingFormValues["options"],
  mode: ListingOfferMode | undefined,
  currency: string,
) {
  const phrases = optionPhrases(options, currency, (count) =>
    m.listing_composer_footer_wanted({ count }),
  );
  if (phrases.length === 0) {
    return m.listing_composer_footer_offers({ offered });
  }
  const summary = m.listing_composer_footer({
    offered,
    wanted: joinOptions(phrases),
  });
  return mode === "price_or_offer"
    ? `${summary} · ${m.listing_payment_open_to_offers_tag()}`
    : summary;
}

function blockedReason(
  block: ReturnType<typeof composerBlock>,
  {
    emptyOption,
    ...ratio
  }: { unitSize: number; offered: number; emptyOption: number },
) {
  switch (block) {
    case "offered":
      return m.listing_composer_reason_offered();
    case "refused":
      return m.listing_composer_reason_refused();
    case "wants":
      return m.listing_composer_reason_wants();
    case "option_empty":
      return m.listing_composer_block_option_empty({ number: emptyOption });
    case "option_repeated":
      return m.listing_composer_block_option_repeat();
    case "range":
      return m.listing_composer_reason_range();
    case "range_too_many":
      return m.listing_composer_reason_range_too_many({
        max: MAX_RANGE_VALUES,
      });
    case "range_artist_unused":
      return m.listing_composer_reason_range_artist_unused();
    case "range_empty":
      return m.trade_error_listing_range_empty();
    case "range_duplicate":
      return m.listing_composer_reason_range_duplicate();
    case "range_repeated":
      return m.listing_composer_reason_range_repeated();
    case "choice":
      return m.listing_composer_reason_choice();
    case "choice_repeated":
      return m.listing_composer_reason_choice_repeated();
    case "ratio":
      return m.listing_composer_reason_ratio(ratio);
    case "note":
      return m.listing_composer_reason_note({ max: MAX_NOTE_LENGTH });
    case "payment_amount":
      return m.listing_composer_reason_payment_amount();
    case "payment_methods":
      return m.listing_composer_reason_payment_methods();
    case null:
      return null;
  }
}
