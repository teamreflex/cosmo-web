import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import {
  type CollectionLookupInput,
  collectionLookupSchema,
} from "@/lib/universal/schema/collections";
import { slugifyObjekt } from "@apollo/util";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
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
  const memberOptions = artistList.flatMap((artist) => artist.artistMembers);
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
    form.setValue("season", parsed.season);
    form.setValue("member", parsed.member);
    form.setValue("collectionNo", parsed.collectionNo);
    onLookup(
      slugifyObjekt(`${parsed.season} ${parsed.member} ${parsed.collectionNo}`),
    );
  }

  return (
    // oxlint-disable-next-line react/react-compiler
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
              <Input
                id="lookup-season"
                placeholder={m.admin_collection_season_placeholder()}
                {...field}
                onPaste={handlePaste}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="member"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="lookup-member">
                {m.admin_collection_member()}
              </FieldLabel>
              <Input
                id="lookup-member"
                list="lookup-member-options"
                placeholder={m.admin_collection_member_placeholder()}
                {...field}
                onPaste={handlePaste}
              />
              <datalist id="lookup-member-options">
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.name} />
                ))}
              </datalist>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
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
