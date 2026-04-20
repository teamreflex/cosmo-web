import CosmoUserCombobox from "@/components/auth/cosmo-user-combobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { m } from "@/i18n/messages";
import { $clearUserPinsCache } from "@/lib/functions/cache";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function ClearPinsCard() {
  const [user, setUser] = useState<CosmoPublicUser | null>(null);
  const mutation = useMutation({
    mutationFn: $clearUserPinsCache,
    onSuccess: () => {
      toast.success(m.admin_cache_cleared());
      setUser(null);
    },
    onError: () => toast.error(m.error_unknown()),
  });

  function onClear() {
    if (!user) return;
    mutation.mutate({ data: { username: user.nickname } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_cache_pins_title()}</CardTitle>
        <CardDescription>{m.admin_cache_pins_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* admin-only pin cache clearing is tripleS-scoped today */}
        <CosmoUserCombobox artistId="tripleS" value={user} onChange={setUser} />
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          onClick={onClear}
          disabled={mutation.isPending || user === null}
        >
          {mutation.isPending ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconTrash className="size-4" />
          )}
          <span>{m.admin_cache_clear()}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
