import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $createLiveList, $createObjektList } from "@/lib/functions/lists";
import { currentAccountQuery } from "@/lib/queries/core";
import { listShelfQuery } from "@/lib/queries/lists";
import { track } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
  createObjektListSchema,
  type ListType,
  listTypes,
} from "../../lib/universal/schema/objekt-list";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ListFormFields from "./list-form-fields";

const listTypeSchema = z.enum(listTypes);

const description = {
  regular: m.list_type_regular_description,
  sale: m.list_type_sale_description,
  have: m.list_type_have_description,
  want: m.list_type_want_description,
} satisfies Record<ListType, () => string>;

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  objektLists: ObjektList[];
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

    void queryClient.invalidateQueries({
      queryKey: listShelfQuery(result.userId).queryKey,
    });

    // matching by routeId covers profiles opened by address, where the pathname doesn't contain the username
    void router.invalidate({
      filter: (route) =>
        route.routeId === "/" || route.routeId.startsWith("/@{$username}"),
    });

    props.onOpenChange(false);
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.list_create()}</DialogTitle>
          <DialogDescription>{description[tab]()}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(listTypeSchema.parse(v))}
        >
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

          {listTypes.map((type) => (
            <TabsContent key={type} value={type}>
              <CreateListForm
                type={type}
                lists={props.objektLists}
                onCreated={handleCreated}
              />
            </TabsContent>
          ))}
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
      <TooltipTrigger render={<span className="contents" />}>
        <TabsTrigger value={value} disabled>
          {children}
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent>{m.list_link_cosmo_required()}</TooltipContent>
    </Tooltip>
  );
}

type FormProps = {
  type: ListType;
  lists: ObjektList[];
  onCreated: (list: ObjektList) => void;
};

function CreateListForm({ type, lists, onCreated }: FormProps) {
  const { currency } = useDisplayCurrency();
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof createObjektListSchema>) =>
      data.type === "have" || data.type === "want"
        ? $createLiveList({ data })
        : $createObjektList({ data }),
    onSuccess: onCreated,
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
  const form = useForm({
    resolver: standardSchemaResolver(createObjektListSchema),
    defaultValues: (
      {
        regular: { type: "regular", name: "", description: undefined },
        sale: { type: "sale", name: "", description: undefined, currency },
        have: {
          type: "have",
          name: "",
          description: undefined,
          discoverable: false,
          pairListId: null,
        },
        want: {
          type: "want",
          name: "",
          description: undefined,
          discoverable: false,
          pairListId: null,
        },
      } satisfies {
        [T in ListType]: Extract<
          z.input<typeof createObjektListSchema>,
          { type: T }
        >;
      }
    )[type],
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="flex w-full flex-col gap-3"
      >
        <ListFormFields type={type} lists={lists} />
        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.common_create()}</span>
          {mutation.isPending && <IconLoader2 className="animate-spin" />}
        </Button>
      </form>
    </FormProvider>
  );
}
