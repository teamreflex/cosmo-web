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
  followUnitSize,
  formUnitSize,
  formValuesToInput,
  type ListingFormValues,
  type ListingSubmission,
  listingToFormValues,
  stepUnitSize,
} from "@/lib/universal/trade-listing-form";
import type { TokenRefusalReason } from "@/lib/universal/trade-listings";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  MAX_CHOICE_OPTIONS,
  MAX_NOTE_LENGTH,
  MAX_OFFERED,
} from "@apollo/trades/caps";
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
import ComposerRatio from "./composer-ratio";
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
  const invalidateListings = useInvalidateListing(editedListing);
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

  // a bundle keeps taking the whole pool, and a ratio is held to a smaller one
  function setOffered(offered: ListingFormValues["offered"]) {
    const options = {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    };
    form.setValue(
      "unitSize",
      followUnitSize(form.getValues("unitSize"), offered.length),
      options,
    );
    form.setValue("offered", offered, options);
  }

  function toggleOffered(objekt: CosmoObjekt) {
    const tokenId = Number(objekt.tokenId);
    const offered = form.getValues("offered");

    if (offered.some((item) => item.tokenId === tokenId)) {
      setOffered(offered.filter((item) => item.tokenId !== tokenId));
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
    setOffered([...offered, { tokenId }]);
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
                  editedListing={editedListing}
                  onAdd={() => setView("picker")}
                  onChange={setOffered}
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
            <RatioStrip form={form} />
            <NoteStrip form={form} />
          </div>
          <ComposerFooter
            form={form}
            mode={mode}
            editedListing={editedListing}
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
  editedListing,
  onAdd,
  onChange,
}: FormProps & {
  display: ComposerDisplay;
  editedListing: string | undefined;
  onAdd: () => void;
  onChange: (offered: ListingFormValues["offered"]) => void;
}) {
  const { offered, tokenIds, refusals } = useOfferedRefusals(
    form,
    editedListing,
  );

  return (
    <ComposerOffered
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
 * The ratio, once the want rows ask for something and there are two or
 * more objekts to split it over, or an edit's ratio takes more than the
 * pool holds, so the poster can lower it.
 */
function RatioStrip({ form }: FormProps) {
  const [offered, unitSize, wants] = useWatch({
    control: form.control,
    name: ["offered", "unitSize", "wants"],
  });
  const wanted = totalWanted(wants);
  const over = unitSize !== undefined && unitSize > offered.length;

  return wanted === 0 || (offered.length < 2 && !over) ? null : (
    <ComposerRatio
      unitSize={formUnitSize({ offered, unitSize })}
      bundle={unitSize === undefined}
      offered={offered.length}
      wanted={wanted}
      onChange={(next) =>
        form.setValue("unitSize", stepUnitSize(next, offered.length), {
          shouldDirty: true,
          shouldValidate: form.formState.isSubmitted,
        })
      }
    />
  );
}

const noRefusals: ReadonlyMap<number, TokenRefusalReason> = new Map();

/**
 * The offered objekts and why the server refuses any of them, which the
 * offered section asks for and the footer reads from the same cache.
 */
function useOfferedRefusals(
  form: FormProps["form"],
  editedListing: string | undefined,
) {
  const offered = useWatch({ control: form.control, name: "offered" });
  const tokenIds = offered.map((item) => item.tokenId);
  const { data: refusals = noRefusals } = useQuery({
    ...offeredTokenRefusalsQuery(tokenIds, editedListing),
    enabled: tokenIds.length > 0,
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
  editedListing,
  pending,
  cancel,
}: FormProps & {
  mode: ComposerMode;
  editedListing: string | undefined;
  pending: boolean;
  cancel: ReactNode;
}) {
  const reasonId = useId();
  const [unitSize, wants, note] = useWatch({
    control: form.control,
    name: ["unitSize", "wants", "note"],
  });
  const { offered, tokenIds, refusals } = useOfferedRefusals(
    form,
    editedListing,
  );
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
      refused: tokenIds.filter((tokenId) => refusals.has(tokenId)).length,
      wants,
      unitSize,
      rangeMatches,
      rangesRepeat: !rangesDistinct(ranges),
      note: note ?? "",
    }),
    { unitSize: formUnitSize({ offered, unitSize }), offered: offered.length },
  );

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:px-5 md:py-3.5">
      <span className="text-center text-xs text-muted-foreground tabular-nums md:text-left">
        {m.listing_composer_footer({
          offered: m.listing_composer_footer_offered({
            count: formUnitSize({ offered, unitSize }),
          }),
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

function blockedReason(
  block: ReturnType<typeof composerBlock>,
  ratio: { unitSize: number; offered: number },
) {
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
    case "choice":
      return m.listing_composer_reason_choice();
    case "choice_too_many":
      return m.listing_composer_choice_full({ max: MAX_CHOICE_OPTIONS });
    case "choice_duplicate":
      return m.listing_composer_reason_choice_duplicate();
    case "choice_repeated":
      return m.listing_composer_reason_choice_repeated();
    case "ratio":
      return m.listing_composer_reason_ratio(ratio);
    case "note":
      return m.listing_composer_reason_note({ max: MAX_NOTE_LENGTH });
    case null:
      return null;
  }
}
