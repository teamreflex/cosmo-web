import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { $createLiveList, $createObjektList } from "@/lib/functions/lists";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { track } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  createHaveListSchema,
  createRegularListSchema,
  createSaleListSchema,
  createWantListSchema,
  defaultCurrencies,
  type ListType,
} from "../../lib/universal/schema/objekt-list";
import Portal from "../portal";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  objektLists: ObjektList[];
  username?: string;
};

export default function CreateListDialog(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cosmo } = useUserState();
  const [tab, setTab] = useState<ListType>("regular");

  function handleCreated(result: ObjektList) {
    track("create-list");
    toast.success(m.toast_list_created());

    queryClient.setQueryData(currentAccountQuery.queryKey, (old) => {
      if (!old) return old;
      return { ...old, objektLists: [...old.objektLists, result] };
    });

    if (props.username) {
      queryClient.setQueryData(
        targetAccountQuery(props.username).queryKey,
        (old) => {
          if (!old) return old;
          return { ...old, objektLists: [...old.objektLists, result] };
        },
      );
    }

    void router.invalidate({
      filter: (route) =>
        route.routeId === "/" ||
        (props.username !== undefined &&
          route.pathname === `/@${props.username}`),
    });

    props.onOpenChange(false);
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{m.list_create()}</DialogTitle>
          <DialogDescription>
            <span id="list-type-description" />
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ListType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="regular">{m.list_type_regular()}</TabsTrigger>
            <TabsTrigger value="sale">{m.list_type_sale()}</TabsTrigger>
            <LiveTypeTrigger value="have" enabled={cosmo !== undefined}>
              {m.list_type_have()}
            </LiveTypeTrigger>
            <LiveTypeTrigger value="want" enabled={cosmo !== undefined}>
              {m.list_type_want()}
            </LiveTypeTrigger>
          </TabsList>

          <TabsContent value="regular">
            <Portal to="#list-type-description">
              {m.list_type_regular_description()}
            </Portal>
            <RegularForm onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="sale">
            <Portal to="#list-type-description">
              {m.list_type_sale_description()}
            </Portal>
            <SaleForm onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="have">
            <Portal to="#list-type-description">
              {m.list_type_have_description()}
            </Portal>
            <HaveForm allLists={props.objektLists} onCreated={handleCreated} />
          </TabsContent>
          <TabsContent value="want">
            <Portal to="#list-type-description">
              {m.list_type_want_description()}
            </Portal>
            <WantForm allLists={props.objektLists} onCreated={handleCreated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LiveTypeTrigger({
  value,
  enabled,
  children,
}: {
  value: Exclude<ListType, "regular">;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (enabled) {
    return <TabsTrigger value={value}>{children}</TabsTrigger>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="contents">
          <TabsTrigger value={value} disabled>
            {children}
          </TabsTrigger>
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.list_link_cosmo_required()}</TooltipContent>
    </Tooltip>
  );
}

type FormProps = {
  onCreated: (list: ObjektList) => void;
};

function RegularForm({ onCreated }: FormProps) {
  const mutation = useMutation({
    mutationFn: $createObjektList,
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(createRegularListSchema),
    defaultValues: {
      type: "regular",
      name: "",
      description: undefined,
    },
  });

  async function handleSubmit(data: z.infer<typeof createRegularListSchema>) {
    const result = await mutation.mutateAsync({ data });
    onCreated(result);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <NameField placeholder={m.list_name_placeholder_regular()} />
        <DescriptionField />
        <SubmitButton isPending={mutation.isPending} />
      </form>
    </FormProvider>
  );
}

function SaleForm({ onCreated }: FormProps) {
  const mutation = useMutation({
    mutationFn: $createObjektList,
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(createSaleListSchema),
    defaultValues: {
      type: "sale",
      name: "",
      description: undefined,
      currency: "",
    },
  });

  async function handleSubmit(data: z.infer<typeof createSaleListSchema>) {
    const result = await mutation.mutateAsync({ data });
    onCreated(result);
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
        <SubmitButton isPending={mutation.isPending} />
      </form>
    </FormProvider>
  );
}

type LiveFormProps = FormProps & {
  allLists: ObjektList[];
};

function HaveForm({ allLists, onCreated }: LiveFormProps) {
  const mutation = useMutation({
    mutationFn: $createLiveList,
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(createHaveListSchema),
    defaultValues: {
      type: "have",
      name: "",
      description: undefined,
      discoverable: false,
      pairListId: null,
    },
  });

  async function handleSubmit(data: z.infer<typeof createHaveListSchema>) {
    const result = await mutation.mutateAsync({ data });
    onCreated(result);
  }

  const availableLists = allLists.filter(
    (l) =>
      l.type === "want" &&
      !allLists.some(
        (other) => other.type === "have" && other.linkedWantListId === l.id,
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
        <SubmitButton isPending={mutation.isPending} />
      </form>
    </FormProvider>
  );
}

function WantForm({ allLists, onCreated }: LiveFormProps) {
  const mutation = useMutation({
    mutationFn: $createLiveList,
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(createWantListSchema),
    defaultValues: {
      type: "want",
      name: "",
      description: undefined,
      discoverable: false,
      pairListId: null,
    },
  });

  async function handleSubmit(data: z.infer<typeof createWantListSchema>) {
    const result = await mutation.mutateAsync({ data });
    onCreated(result);
  }

  const availableLists = allLists.filter(
    (l) => l.type === "have" && l.linkedWantListId === null,
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
        <SubmitButton isPending={mutation.isPending} />
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

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      <span>{m.common_create()}</span>
      {isPending && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
