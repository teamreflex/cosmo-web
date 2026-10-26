import CosmoUserCombobox from "@/components/auth/cosmo-user-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { roleLabel } from "@/lib/client/roles";
import { env } from "@/lib/env/client";
import { $setRole } from "@/lib/functions/staff-users";
import { roleUserQuery } from "@/lib/queries/staff-users";
import {
  type SetRoleInput,
  setRoleInputSchema,
} from "@/lib/universal/schema/staff-users";
import { type RoleUser, staffUserText } from "@/lib/universal/staff-users";
import { roleNames } from "@apollo/auth";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useId, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

/**
 * Changes a user's role. The admin finds their COSMO account through COSMO's
 * own user search, and the account's address leads to the user who linked
 * it. The role starts at their current one, so submitting stays off until
 * it differs.
 */
export default function SetRoleDialog() {
  const accountId = useId();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<CosmoPublicUser | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setAccount(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>{m.admin_role_submit()}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.admin_role_title()}</DialogTitle>
          <DialogDescription>{m.admin_role_description()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={accountId}>{m.admin_role_user()}</FieldLabel>
            {/* the artist only picks which profile image the results show */}
            <CosmoUserCombobox
              id={accountId}
              artistId="tripleS"
              value={account}
              onChange={setAccount}
            />
          </Field>
          {account === null ? (
            <RoleDialogFooter submit="disabled" />
          ) : (
            <ErrorBoundary
              key={account.address}
              fallback={
                <p className="text-sm text-destructive">{m.error_unknown()}</p>
              }
            >
              <Suspense
                fallback={
                  <div className="flex justify-center py-4">
                    <IconLoader2 className="size-5 animate-spin" />
                  </div>
                }
              >
                <AccountRole
                  account={account}
                  onDone={() => handleOpenChange(false)}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AccountRoleProps = {
  account: CosmoPublicUser;
  onDone: () => void;
};

/**
 * The role form for the user who linked the picked account, or a note that
 * nobody has, which leaves no role to change.
 */
function AccountRole({ account, onDone }: AccountRoleProps) {
  const { data: target } = useSuspenseQuery(roleUserQuery(account.address));

  if (target === null) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {m.admin_role_not_linked({ appName: env.VITE_APP_NAME })}
        </p>
        <RoleDialogFooter submit="disabled" />
      </>
    );
  }

  // a stale lookup refetches underneath the form, so remount it to start from the fresh role
  return (
    <RoleForm
      key={target.role}
      username={staffUserText({ kind: "cosmo", username: account.nickname })}
      target={target}
      onDone={onDone}
    />
  );
}

type RoleFormProps = {
  username: string;
  target: RoleUser;
  onDone: () => void;
};

function RoleForm({ username, target, onDone }: RoleFormProps) {
  const roleId = useId();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(setRoleInputSchema),
    defaultValues: {
      userId: target.id,
      role: target.role,
    } satisfies SetRoleInput,
  });
  const role = useWatch({ control: form.control, name: "role" });

  const mutation = useMutation({
    mutationFn: $setRole,
    onSuccess: async (_, { data }) => {
      toast.success(
        m.admin_role_success({ username, role: roleLabel(data.role) }),
      );
      onDone();
      // the audit log and the role lookup, which show the old role
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
  const roleItems = roleNames.map((value) => ({
    value,
    label: roleLabel(value),
  }));

  return (
    <form
      onSubmit={form.handleSubmit((data) => mutation.mutate({ data }))}
      className="flex flex-col gap-4"
    >
      <Controller
        control={form.control}
        name="role"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={roleId}>{m.admin_role_role()}</FieldLabel>
            <Select
              items={roleItems}
              value={field.value}
              onValueChange={(value) => {
                if (value !== null) field.onChange(value);
              }}
            >
              <SelectTrigger
                id={roleId}
                className="w-full max-sm:data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {m.admin_role_current({ role: roleLabel(target.role) })}
            </FieldDescription>
          </Field>
        )}
      />
      <p className="text-xs text-muted-foreground">{m.admin_role_note()}</p>
      <RoleDialogFooter
        submit={
          mutation.isPending
            ? "pending"
            : role === target.role
              ? "disabled"
              : "enabled"
        }
      />
    </form>
  );
}

function RoleDialogFooter({
  submit,
}: {
  submit: "enabled" | "disabled" | "pending";
}) {
  return (
    <DialogFooter className="mt-2">
      <DialogClose
        render={
          <Button type="button" variant="outline" className="max-sm:h-11" />
        }
      >
        {m.common_cancel()}
      </DialogClose>
      <Button
        type="submit"
        className="max-sm:h-11"
        disabled={submit !== "enabled"}
      >
        <span>{m.admin_role_submit()}</span>
        {submit === "pending" && <IconLoader2 className="animate-spin" />}
      </Button>
    </DialogFooter>
  );
}
