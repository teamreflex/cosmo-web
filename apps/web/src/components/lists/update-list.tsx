import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { $updateLiveList, $updateObjektList } from "@/lib/functions/lists";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import type { ObjektList } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useFormState,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  defaultCurrencies,
  updateHaveListSchema,
  updateRegularListSchema,
  updateSaleListSchema,
  updateWantListSchema,
} from "../../lib/universal/schema/objekt-list";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Field, FieldError, FieldLabel } from "../ui/field";
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

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const account = useSuspenseQuery(currentAccountQuery);
  const queryClient = useQueryClient();
  const { cosmo } = useUserState();

  const allLists = account.data?.objektLists ?? [];

  function handleSubmit() {
    void queryClient.invalidateQueries({
      queryKey: currentAccountQuery.queryKey,
    });
    if (cosmo?.username) {
      void queryClient.invalidateQueries({
        queryKey: targetAccountQuery(cosmo.username).queryKey,
      });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={m.aria_edit_list()}
        >
          <IconEdit />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{m.list_update()}</DialogTitle>
        </DialogHeader>

        {objektList.type === "regular" && (
          <RegularForm objektList={objektList} onSubmit={handleSubmit} />
        )}
        {objektList.type === "sale" && (
          <SaleForm objektList={objektList} onSubmit={handleSubmit} />
        )}
        {objektList.type === "have" && (
          <HaveForm
            objektList={objektList}
            allLists={allLists}
            onSubmit={handleSubmit}
          />
        )}
        {objektList.type === "want" && (
          <WantForm
            objektList={objektList}
            allLists={allLists}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = {
  objektList: ObjektList;
  onSubmit: () => void;
};

function RegularForm({ objektList, onSubmit }: FormProps) {
  const mutation = useMutation({
    mutationFn: useServerFn($updateObjektList),
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(updateRegularListSchema),
    defaultValues: {
      type: "regular",
      id: objektList.id,
      name: objektList.name,
      description: objektList.description ?? undefined,
    },
  });

  async function handleSubmit(data: z.infer<typeof updateRegularListSchema>) {
    await mutation.mutateAsync({ data });
    onSubmit();
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <NameField placeholder={m.list_name_placeholder_regular()} />
        <DescriptionField />
        <SubmitButton />
      </form>
    </FormProvider>
  );
}

function SaleForm({ objektList, onSubmit }: FormProps) {
  const mutation = useMutation({
    mutationFn: useServerFn($updateObjektList),
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(updateSaleListSchema),
    defaultValues: {
      type: "sale",
      id: objektList.id,
      name: objektList.name,
      description: objektList.description ?? undefined,
      currency: objektList.currency ?? "",
    },
  });

  async function handleSubmit(data: z.infer<typeof updateSaleListSchema>) {
    await mutation.mutateAsync({ data });
    onSubmit();
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <NameField placeholder={m.list_name_placeholder_sale()} />
        <DescriptionField />
        <CurrencyField />
        <SubmitButton />
      </form>
    </FormProvider>
  );
}

type LiveFormProps = FormProps & {
  allLists: ObjektList[];
};

function HaveForm({ objektList, allLists, onSubmit }: LiveFormProps) {
  const mutation = useMutation({
    mutationFn: useServerFn($updateLiveList),
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(updateHaveListSchema),
    defaultValues: {
      type: "have",
      id: objektList.id,
      name: objektList.name,
      description: objektList.description ?? undefined,
      discoverable: objektList.discoverable,
      pairListId: objektList.linkedWantListId,
    },
  });

  async function handleSubmit(data: z.infer<typeof updateHaveListSchema>) {
    await mutation.mutateAsync({ data });
    onSubmit();
  }

  const availableLists = allLists.filter(
    (l) =>
      l.type === "want" &&
      !allLists.some(
        (other) =>
          other.type === "have" &&
          other.id !== objektList.id &&
          other.linkedWantListId === l.id,
      ),
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <NameField placeholder={m.list_name_placeholder_have()} />
        <DescriptionField />
        <DiscoverableField />
        <PairField availableLists={availableLists} />
        <SubmitButton />
      </form>
    </FormProvider>
  );
}

function WantForm({ objektList, allLists, onSubmit }: LiveFormProps) {
  const mutation = useMutation({
    mutationFn: useServerFn($updateLiveList),
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const currentHave = allLists.find(
    (l) => l.type === "have" && l.linkedWantListId === objektList.id,
  );
  const form = useForm({
    resolver: standardSchemaResolver(updateWantListSchema),
    defaultValues: {
      type: "want",
      id: objektList.id,
      name: objektList.name,
      description: objektList.description ?? undefined,
      discoverable: objektList.discoverable,
      pairListId: currentHave?.id ?? null,
    },
  });

  async function handleSubmit(data: z.infer<typeof updateWantListSchema>) {
    await mutation.mutateAsync({ data });
    onSubmit();
  }

  const availableLists = allLists.filter(
    (l) =>
      l.type === "have" &&
      (l.linkedWantListId === null || l.linkedWantListId === objektList.id),
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <NameField placeholder={m.list_name_placeholder_want()} />
        <DescriptionField />
        <DiscoverableField />
        <PairField availableLists={availableLists} />
        <SubmitButton />
      </form>
    </FormProvider>
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

function DescriptionField() {
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
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function CurrencyField() {
  const form = useFormContext<{ currency?: string | null }>();
  return (
    <Controller
      control={form.control}
      name="currency"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{m.list_currency()}</FieldLabel>
          <Input
            placeholder="USD"
            maxLength={3}
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(e.target.value === "" ? undefined : e.target.value)
            }
          />
          <div className="flex gap-1">
            {defaultCurrencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  field.onChange(field.value === c ? undefined : c)
                }
                className="rounded-md border px-2 py-0.5 text-xs data-[active=true]:bg-accent"
                data-active={field.value?.toUpperCase() === c}
                aria-pressed={field.value?.toUpperCase() === c}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {m.list_currency_description()}
          </p>
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
          <p className="text-xs text-muted-foreground">
            {m.list_discoverable_description()}
          </p>
        </Field>
      )}
    />
  );
}

function PairField({ availableLists }: { availableLists: ObjektList[] }) {
  const form = useFormContext<{ pairListId: string | null }>();
  return (
    <Controller
      control={form.control}
      name="pairListId"
      render={({ field }) => (
        <Field>
          <FieldLabel>{m.list_pair_with()}</FieldLabel>
          <Select
            value={field.value ?? "__unpaired__"}
            onValueChange={(value) =>
              field.onChange(value === "__unpaired__" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unpaired__">
                {m.list_pair_unpair()}
              </SelectItem>
              {availableLists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {m.list_pair_required_for_matching()}
          </p>
        </Field>
      )}
    />
  );
}

function SubmitButton() {
  const { isSubmitting } = useFormState();

  return (
    <Button type="submit" disabled={isSubmitting}>
      <span>{m.common_save()}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
