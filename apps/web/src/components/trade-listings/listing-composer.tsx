import { useArtists } from "@/hooks/use-artists";
import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import {
  collectionShown,
  type ComposerDisplay,
  emptyComposerDisplay,
  listingComposerDisplay,
} from "@/lib/client/trade-listings";
import { $editListing, $postListing } from "@/lib/functions/trade-listings";
import {
  offeredTokenRefusalsQuery,
  rangeMatchCountQuery,
  tradeListingQuery,
  tradeListingViewerKey,
} from "@/lib/queries/trade-listings";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";
import { Objekt } from "@/lib/universal/objekt-conversion";
import {
  composerBlock,
  type ComposerMode,
  emptyListingForm,
  formValuesToInput,
  type ListingFormValues,
  type ListingSubmission,
  listingToFormValues,
} from "@/lib/universal/trade-listing-form";
import type { TokenRefusalReason } from "@/lib/universal/trade-listings";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { MAX_NOTE_LENGTH, MAX_OFFERED } from "@apollo/trades/caps";
import { totalWanted } from "@apollo/trades/composer";
import {
  type ListingInput,
  listingInputSchema,
  rangesDistinct,
} from "@apollo/trades/listing";
import { MAX_RANGE_VALUES, rangeFilterSchema } from "@apollo/trades/range";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
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
import ComposerOffered from "./composer-offered";
import ComposerWantRows from "./composer-want-rows";
import TradePicker from "./trade-picker";
import TradeSheet from "./trade-sheet";

type Props = {
  mode: ComposerMode;
  /** the poster's linked COSMO address, whose collection the picker lists */
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Posts a trade listing, or replaces the terms of the poster's open one: the
 * objekts it offers, the rows it asks for and a note. A centred dialog on
 * desktop and a tall bottom drawer on phones; the form lives above that
 * switch, so crossing the breakpoint keeps everything entered.
 */
export default function ListingComposer({
  mode,
  address,
  open,
  onOpenChange,
}: Props) {
  const isDesktop = useMediaQuery();
  const queryClient = useQueryClient();
  const invalidateListings = useInvalidateListing(
    mode.kind === "edit" ? mode.listing.id : undefined,
  );
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
  const [display, setDisplay] = useState<ComposerDisplay>(initialDisplay);
  const [discarding, setDiscarding] = useState(false);
  // read during render so the form keeps it current for requestClose
  const { isDirty } = form.formState;
  // a double click submits once, even before the pending state renders
  const submitting = useRef(false);
  const { artistList } = useArtists();
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
        void queryClient.invalidateQueries({ queryKey: tradeListingViewerKey });
        return;
      }

      if (mode.kind === "create") {
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
        (error.message === "listing_claimed" ||
          error.message === "listing_closed" ||
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

  function toggleOffered(objekt: CosmoObjekt) {
    const tokenId = Number(objekt.tokenId);
    const offered = form.getValues("offered");
    const options = {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    };

    if (offered.some((item) => item.tokenId === tokenId)) {
      form.setValue(
        "offered",
        offered.filter((item) => item.tokenId !== tokenId),
        options,
      );
      return;
    }
    if (offered.length >= MAX_OFFERED) return;

    const { collection, objekt: token } = Objekt.fromLegacy(objekt);
    setDisplay((current) => ({
      ...current,
      tokens: new Map(current.tokens).set(tokenId, {
        ...collectionShown(collection),
        serial: token.serial,
      }),
    }));
    form.setValue("offered", [...offered, { tokenId }], options);
  }

  function submit(values: ListingInput) {
    if (submitting.current) return;
    submitting.current = true;
    mutation.mutate(formValuesToInput(values, mode, rosters));
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
                  onAdd={() => setView("picker")}
                />
              </div>
              <ComposerWantRows
                form={form}
                display={display}
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
            <NoteStrip form={form} />
          </div>
          <ComposerFooter
            form={form}
            mode={mode}
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
    </form>
  );

  return (
    <TradeSheet
      title={title}
      closeDisabled={mutation.isPending}
      open={open}
      onOpenChange={requestClose}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      {shell}
    </TradeSheet>
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
  onAdd,
}: FormProps & { display: ComposerDisplay; onAdd: () => void }) {
  const offered = useWatch({ control: form.control, name: "offered" });
  const tokenIds = offered.map((item) => item.tokenId);
  const { data: refusals } = useQuery({
    ...offeredTokenRefusalsQuery(tokenIds),
    enabled: tokenIds.length > 0,
  });

  return (
    <ComposerOffered
      tokenIds={tokenIds}
      tokens={display.tokens}
      refusals={refusals ?? noRefusals}
      error={form.formState.errors.offered?.message}
      onAdd={onAdd}
      onRemove={(tokenId) =>
        form.setValue(
          "offered",
          offered.filter((item) => item.tokenId !== tokenId),
          { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
        )
      }
    />
  );
}

const noRefusals: ReadonlyMap<number, TokenRefusalReason> = new Map();

function PickerView({
  form,
  address,
  onToggle,
  onBack,
}: FormProps & {
  address: string;
  onToggle: (objekt: CosmoObjekt) => void;
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
 * The trade at a glance, why posting is held back when it is, and the
 * buttons. On phones the footer stays pinned under the scrolling form.
 */
function ComposerFooter({
  form,
  mode,
  pending,
  cancel,
}: FormProps & { mode: ComposerMode; pending: boolean; cancel: ReactNode }) {
  const reasonId = useId();
  const [offered, wants, note] = useWatch({
    control: form.control,
    name: ["offered", "wants", "note"],
  });
  const tokenIds = offered.map((item) => item.tokenId);
  // the offered section asks the server; this reads the answer it cached
  const { data: refusals } = useQuery({
    ...offeredTokenRefusalsQuery(tokenIds),
    enabled: tokenIds.length > 0,
  });
  // the range rows as the schema reads them, so repeats compare as the server does
  const ranges = wants.flatMap((want) => {
    if (want.kind !== "range") return [];
    const parsed = rangeFilterSchema.safeParse(want.filter);
    return parsed.success ? [parsed.data] : [];
  });
  // the range rows count their own matches; this reads the counts they cached
  const rangeMatches = useQueries({
    queries: ranges.map((filter) => ({
      ...rangeMatchCountQuery(filter),
      enabled: false,
    })),
    combine: (results) => results.map((result) => result.data),
  });
  const reason = blockedReason(
    composerBlock({
      offered: offered.length,
      refused: tokenIds.filter((tokenId) => refusals?.has(tokenId)).length,
      wants,
      rangeMatches,
      rangesRepeat: !rangesDistinct(ranges),
      note: note ?? "",
    }),
  );

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:px-5 md:py-3.5">
      <span className="text-center text-xs text-muted-foreground tabular-nums md:text-left">
        {m.listing_composer_footer({
          offered: m.listing_composer_footer_offered({ count: offered.length }),
          wanted: m.listing_composer_footer_wanted({
            count: totalWanted(wants),
          }),
        })}
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

function blockedReason(block: ReturnType<typeof composerBlock>) {
  switch (block) {
    case "offered":
      return m.listing_composer_reason_offered();
    case "refused":
      return m.listing_composer_reason_refused();
    case "wants":
      return m.listing_composer_reason_wants();
    case "range":
      return m.listing_composer_reason_range();
    case "range_too_many":
      return m.listing_composer_reason_range_too_many({
        max: MAX_RANGE_VALUES,
      });
    case "range_empty":
      return m.trade_error_listing_range_empty();
    case "range_repeated":
      return m.listing_composer_reason_range_repeated();
    case "note":
      return m.listing_composer_reason_note({ max: MAX_NOTE_LENGTH });
    case null:
      return null;
  }
}
