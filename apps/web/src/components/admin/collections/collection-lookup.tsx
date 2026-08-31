import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArtists } from "@/hooks/use-artists";
import { getSeasonKeys } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { filterDataQuery } from "@/lib/queries/core";
import {
  type CollectionLookupInput,
  collectionLookupSchema,
} from "@/lib/universal/schema/collections";
import { slugifyObjekt } from "@apollo/util";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

type Props = {
  onLookup: (slug: string) => void;
  isLoading: boolean;
};

// Split a pasted collectionId ("Atom01 JinSoul 101Z") or slug
// ("atom01-jinsoul-101z") into its three segments, or null if it isn't one.
function parseIdentifier(text: string) {
  const trimmed = text.trim();
  const parts = trimmed.includes(" ")
    ? trimmed.split(/\s+/)
    : trimmed.split("-");

  const [season, member, collectionNo] = parts;
  if (parts.length !== 3 || !season || !member || !collectionNo) {
    return null;
  }

  return { season, member, collectionNo };
}

export default function CollectionLookup({ onLookup, isLoading }: Props) {
  const { artistList } = useArtists();
  const { data: filterData } = useSuspenseQuery(filterDataQuery);
  const [memberOpen, setMemberOpen] = useState(false);
  const memberNames = [
    ...new Set(
      artistList.flatMap((artist) => artist.artistMembers.map((am) => am.name)),
    ),
  ];
  // artist is unknown at lookup time, so offer every artist's seasons
  const seasonOptions = getSeasonKeys([
    ...new Set(filterData.seasons.flatMap((s) => s.seasons)),
  ]);
  const form = useForm({
    resolver: standardSchemaResolver(collectionLookupSchema),
    defaultValues: { season: "", member: "", collectionNo: "" },
  });

  function handleSubmit(data: CollectionLookupInput) {
    const slug = slugifyObjekt(
      `${data.season} ${data.member} ${data.collectionNo}`,
    );
    onLookup(slug);
  }

  // Detect a full collectionId/slug pasted into any field: fan it out across
  // the three inputs and look it up immediately.
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const parsed = parseIdentifier(e.clipboardData.getData("text"));
    if (!parsed) {
      return;
    }

    e.preventDefault();
    // map the pasted season onto its canonical casing so the select shows it
    const season =
      seasonOptions.find(
        (s) => s.name.toLowerCase() === parsed.season.toLowerCase(),
      )?.name ?? parsed.season;
    form.setValue("season", season);
    form.setValue("member", parsed.member);
    form.setValue("collectionNo", parsed.collectionNo);
    onLookup(
      slugifyObjekt(`${parsed.season} ${parsed.member} ${parsed.collectionNo}`),
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          control={form.control}
          name="season"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lookup-season">
                {m.admin_collection_season()}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="lookup-season" className="w-full">
                  <SelectValue
                    placeholder={m.admin_collection_season_placeholder()}
                  />
                </SelectTrigger>
                <SelectContent>
                  {seasonOptions.map(({ key, name }) => (
                    <SelectItem key={name} value={name}>
                      <Badge
                        // SAFETY: every season key has a season-* badge variant
                        variant={`season-${key}` as "season-atom"}
                      >
                        {name}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="member"
          render={({ field, fieldState }) => {
            const matches = memberNames.filter((name) =>
              name.toLowerCase().includes(field.value.toLowerCase()),
            );

            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="lookup-member">
                  {m.admin_collection_member()}
                </FieldLabel>
                <Popover
                  open={memberOpen && matches.length > 0}
                  onOpenChange={setMemberOpen}
                >
                  <PopoverAnchor asChild>
                    <Input
                      id="lookup-member"
                      autoComplete="off"
                      placeholder={m.admin_collection_member_placeholder()}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setMemberOpen(true);
                      }}
                      onFocus={() => setMemberOpen(true)}
                      onBlur={() => {
                        field.onBlur();
                        setMemberOpen(false);
                      }}
                      onPaste={handlePaste}
                    />
                  </PopoverAnchor>
                  <PopoverContent
                    align="start"
                    className="max-h-60 w-(--radix-popover-trigger-width) overflow-y-auto p-1"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    {matches.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        // keep focus in the input so blur doesn't eat the click
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          field.onChange(name);
                          setMemberOpen(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <FieldError errors={[fieldState.error]} />
              </Field>
            );
          }}
        />

        <Controller
          control={form.control}
          name="collectionNo"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lookup-collection-no">
                {m.admin_collection_no()}
              </FieldLabel>
              <Input
                id="lookup-collection-no"
                placeholder={m.admin_collection_no_placeholder()}
                {...field}
                onPaste={handlePaste}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <Button type="submit" className="w-fit" disabled={isLoading}>
        {isLoading ? (
          <IconLoader2 className="size-4 animate-spin" />
        ) : (
          <IconSearch className="size-4" />
        )}
        <span>{m.admin_collection_load()}</span>
      </Button>
    </form>
  );
}
