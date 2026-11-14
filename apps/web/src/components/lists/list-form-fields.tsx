import { m } from "@/i18n/messages";
import type { ListType } from "@/lib/universal/schema/objekt-list";
import type { ObjektList } from "@apollo/database/web/types";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Controller, useFormContext } from "react-hook-form";
import CurrencySelect from "../misc/currency-select";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const namePlaceholder = {
  regular: m.list_name_placeholder_regular,
  sale: m.list_name_placeholder_sale,
  have: m.list_name_placeholder_have,
  want: m.list_name_placeholder_want,
} satisfies Record<ListType, () => string>;

type Props = {
  type: ListType;
  // every list of the signed-in user, which a have or want list picks its pair from
  lists: ObjektList[];
  // the list being edited, absent while creating one
  listId?: string;
};

/**
 * The fields of the create and edit list forms, rendered inside the form's
 * `FormProvider`: name and description for every type, currency for a sale
 * list, discoverable and pair for a have or want list.
 */
export default function ListFormFields({ type, lists, listId }: Props) {
  return (
    <>
      <NameField placeholder={namePlaceholder[type]()} />
      <DescriptionField showPublicNotice={listId === undefined} />
      {type === "sale" && <CurrencyField warnOnChange={listId !== undefined} />}
      {(type === "have" || type === "want") && (
        <>
          <DiscoverableField />
          <PairField type={type} lists={lists} listId={listId} />
        </>
      )}
    </>
  );
}

function NameField({ placeholder }: { placeholder: string }) {
  const form = useFormContext<{ name: string }>();
  return (
    <Controller
      control={form.control}
      name="name"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="name">{m.list_name()}</FieldLabel>
          <Input
            id="name"
            placeholder={placeholder}
            data-1p-ignore
            autoFocus
            aria-invalid={fieldState.invalid}
            {...field}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function DescriptionField({ showPublicNotice }: { showPublicNotice: boolean }) {
  const form = useFormContext<{ description?: string | null }>();
  return (
    <Controller
      control={form.control}
      name="description"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="description">{m.list_description()}</FieldLabel>
          <Textarea
            id="description"
            placeholder={m.list_description_placeholder()}
            rows={3}
            maxLength={500}
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(e.target.value === "" ? undefined : e.target.value)
            }
          />
          {showPublicNotice && (
            <FieldDescription>
              {m.list_description_public_notice()}
            </FieldDescription>
          )}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function CurrencyField({ warnOnChange }: { warnOnChange: boolean }) {
  const form = useFormContext<{ currency?: string | null }>();
  return (
    <Controller
      control={form.control}
      name="currency"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="currency">{m.list_currency()}</FieldLabel>
          <CurrencySelect
            id="currency"
            name="currency"
            value={field.value ?? null}
            onValueChange={field.onChange}
          />
          <FieldDescription>{m.list_currency_description()}</FieldDescription>
          {warnOnChange && fieldState.isDirty && (
            <FieldDescription
              role="status"
              className="flex gap-1.5 text-amber-600 dark:text-amber-500"
            >
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
              {m.list_currency_change_warning()}
            </FieldDescription>
          )}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function DiscoverableField() {
  const form = useFormContext<{ discoverable: boolean }>();
  return (
    <Controller
      control={form.control}
      name="discoverable"
      render={({ field }) => (
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="discoverable">
              {m.list_discoverable()}
            </FieldLabel>
            <Switch
              id="discoverable"
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          </div>
          <FieldDescription>
            {m.list_discoverable_description()}
          </FieldDescription>
        </Field>
      )}
    />
  );
}

type PairFieldProps = {
  type: "have" | "want";
  lists: ObjektList[];
  listId: string | undefined;
};

function PairField({ type, lists, listId }: PairFieldProps) {
  const form = useFormContext<{ pairListId: string | null }>();
  /**
   * A pair links one have list to one want list, so the select offers the
   * lists of the opposite type that aren't paired with another list.
   */
  const items = [
    { value: "__unpaired__", label: m.list_pair_unpair() },
    ...lists
      .filter((list) =>
        type === "have"
          ? list.type === "want" &&
            !lists.some(
              (other) =>
                other.type === "have" &&
                other.id !== listId &&
                other.linkedWantListId === list.id,
            )
          : list.type === "have" &&
            (list.linkedWantListId === null ||
              list.linkedWantListId === listId),
      )
      .map((list) => ({ value: list.id, label: list.name })),
  ];
  return (
    <Controller
      control={form.control}
      name="pairListId"
      render={({ field }) => (
        <Field>
          <FieldLabel>{m.list_pair_with()}</FieldLabel>
          <Select
            items={items}
            value={field.value ?? "__unpaired__"}
            onValueChange={(value) =>
              field.onChange(value === "__unpaired__" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {m.list_pair_required_for_matching()}
          </FieldDescription>
        </Field>
      )}
    />
  );
}
