import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import { filterDataQuery } from "@/lib/queries/core";
import type { UpdateCollectionInput } from "@/lib/universal/schema/collections";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import CollectionMediaUpload from "./collection-media-upload";

type Props = {
  currentMedia: string | null;
  stagedFile: File | null;
  onFileSelect: (file: File | null) => void;
};

export default function CollectionForm(props: Props) {
  const form = useFormContext<UpdateCollectionInput>();
  const { artistList } = useArtists();
  const { data: filterData } = useSuspenseQuery(filterDataQuery);

  const selectedArtist = useWatch({ control: form.control, name: "artist" });
  const selectedClass = useWatch({ control: form.control, name: "class" });

  const artist = artistList.find((a) => a.id === selectedArtist);
  const memberOptions =
    artist?.artistMembers ?? artistList.flatMap((a) => a.artistMembers);
  const seasonOptions =
    filterData.seasons.find((s) => s.artistId === selectedArtist)?.seasons ??
    [];
  const classOptions =
    filterData.classes.find((c) => c.artistId === selectedArtist)?.classes ??
    [];

  return (
    <div className="flex flex-col gap-4">
      {/* Artist */}
      <Controller
        control={form.control}
        name="artist"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="artist">
              {m.admin_collection_artist()}
            </FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                className={cn("w-full", fieldState.isDirty && "border-cosmo")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {artistList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <img
                      src={a.logoImageUrl}
                      alt={a.title}
                      className="aspect-square size-4 rounded-full"
                    />
                    <span>{a.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Member */}
      <Controller
        control={form.control}
        name="member"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="member">
              {m.admin_collection_member()}
            </FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                className={cn("w-full", fieldState.isDirty && "border-cosmo")}
              >
                <SelectValue
                  placeholder={m.admin_collection_member_placeholder()}
                />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((member) => (
                  <SelectItem key={member.id} value={member.name}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Season + Class */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="season"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="season">
                {m.admin_collection_season()}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={cn("w-full", fieldState.isDirty && "border-cosmo")}
                >
                  <SelectValue
                    placeholder={m.admin_collection_season_placeholder()}
                  />
                </SelectTrigger>
                <SelectContent>
                  {seasonOptions.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
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
          name="class"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="class">
                {m.admin_collection_class()}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={cn("w-full", fieldState.isDirty && "border-cosmo")}
                >
                  <SelectValue
                    placeholder={m.admin_collection_class_placeholder()}
                  />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      {/* Collection No */}
      <Controller
        control={form.control}
        name="collectionNo"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="collectionNo">
              {m.admin_collection_no()}
            </FieldLabel>
            <Input
              id="collectionNo"
              className={cn(fieldState.isDirty && "border-cosmo")}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Colors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorField name="textColor" label={m.admin_collection_text_color()} />
        <ColorField
          name="backgroundColor"
          label={m.admin_collection_background_color()}
        />
        <ColorField
          name="accentColor"
          label={m.admin_collection_accent_color()}
        />
      </div>

      {/* Online / Offline */}
      <Controller
        control={form.control}
        name="onOffline"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="onOffline">
              {m.admin_collection_on_offline()}
            </FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                className={cn("w-full", fieldState.isDirty && "border-cosmo")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  {m.admin_collection_online()}
                </SelectItem>
                <SelectItem value="offline">
                  {m.admin_collection_offline()}
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Has Audio */}
      <Controller
        control={form.control}
        name="hasAudio"
        render={({ field, fieldState }) => (
          <Field orientation="horizontal">
            <FieldLabel htmlFor="hasAudio">
              {m.admin_collection_has_audio()}
            </FieldLabel>
            <Switch
              id="hasAudio"
              checked={field.value}
              onCheckedChange={field.onChange}
              className={cn(fieldState.isDirty && "border-cosmo")}
            />
          </Field>
        )}
      />

      {/* Front Media */}
      <Field>
        <FieldLabel>{m.admin_collection_front_media()}</FieldLabel>
        <CollectionMediaUpload
          currentMedia={props.currentMedia}
          stagedFile={props.stagedFile}
          onFileSelect={props.onFileSelect}
          objektClass={selectedClass}
        />
      </Field>
    </div>
  );
}

// Hex/color field: a native color swatch paired with a free-text input so
// non-hex legacy values (rgb(), bare hex) remain visible and editable.
function ColorField({
  name,
  label,
}: {
  name: "textColor" | "backgroundColor" | "accentColor";
  label: string;
}) {
  const form = useFormContext<UpdateCollectionInput>();

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const swatch = /^#[0-9a-fA-F]{6}$/.test(field.value)
          ? field.value
          : "#000000";
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label={label}
                value={swatch}
                onChange={(e) => field.onChange(e.target.value)}
                className={cn(
                  "h-9 w-10 shrink-0 rounded-sm border border-border bg-background",
                  fieldState.isDirty && "border-cosmo",
                )}
              />
              <Input
                id={name}
                className={cn(fieldState.isDirty && "border-cosmo")}
                {...field}
              />
            </div>
            <FieldError errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
