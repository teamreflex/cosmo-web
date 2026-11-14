import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $updateLiveList, $updateObjektList } from "@/lib/functions/lists";
import { currentAccountQuery } from "@/lib/queries/core";
import { listShelfQuery } from "@/lib/queries/lists";
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
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  type ListType,
  updateObjektListSchema,
} from "../../lib/universal/schema/objekt-list";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import ListFormFields from "./list-form-fields";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const account = useSuspenseQuery(currentAccountQuery);
  const queryClient = useQueryClient();

  function handleSubmit() {
    void queryClient.invalidateQueries({
      queryKey: currentAccountQuery.queryKey,
    });
    void queryClient.invalidateQueries({
      queryKey: listShelfQuery(objektList.userId).queryKey,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.aria_edit_list()}
          />
        }
      >
        <IconEdit />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.list_update()}</DialogTitle>
        </DialogHeader>

        <UpdateListForm
          objektList={objektList}
          lists={account.data?.objektLists ?? []}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

type FormProps = {
  objektList: ObjektList;
  lists: ObjektList[];
  onSubmit: () => void;
};

function UpdateListForm({ objektList, lists, onSubmit }: FormProps) {
  const updateObjektList = useServerFn($updateObjektList);
  const updateLiveList = useServerFn($updateLiveList);
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof updateObjektListSchema>) =>
      data.type === "have" || data.type === "want"
        ? updateLiveList({ data })
        : updateObjektList({ data }),
    onSuccess: onSubmit,
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
  const shared = {
    id: objektList.id,
    name: objektList.name,
    description: objektList.description ?? undefined,
  };
  const form = useForm({
    resolver: standardSchemaResolver(updateObjektListSchema),
    defaultValues: (
      {
        regular: { ...shared, type: "regular" },
        sale: {
          ...shared,
          type: "sale",
          currency: objektList.currency ?? "",
        },
        have: {
          ...shared,
          type: "have",
          discoverable: objektList.discoverable,
          pairListId: objektList.linkedWantListId,
        },
        // the have list holds the link, so a want list finds its pair through it
        want: {
          ...shared,
          type: "want",
          discoverable: objektList.discoverable,
          pairListId:
            lists.find(
              (l) => l.type === "have" && l.linkedWantListId === objektList.id,
            )?.id ?? null,
        },
      } satisfies {
        [T in ListType]: Extract<
          z.input<typeof updateObjektListSchema>,
          { type: T }
        >;
      }
    )[objektList.type],
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="flex w-full flex-col gap-3"
      >
        <ListFormFields
          type={objektList.type}
          lists={lists}
          listId={objektList.id}
        />
        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.common_save()}</span>
          {mutation.isPending && <IconLoader2 className="animate-spin" />}
        </Button>
      </form>
    </FormProvider>
  );
}
