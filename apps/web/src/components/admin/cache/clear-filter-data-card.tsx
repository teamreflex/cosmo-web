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
import { $clearFilterDataCache } from "@/lib/functions/cache";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ClearFilterDataCard() {
  const mutation = useMutation({
    mutationFn: $clearFilterDataCache,
    onSuccess: () => toast.success(m.admin_cache_cleared()),
    onError: () => toast.error(m.error_unknown()),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_cache_filter_data_title()}</CardTitle>
        <CardDescription>
          {m.admin_cache_filter_data_description()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Button
          variant="destructive"
          onClick={() => mutation.mutate(undefined)}
          disabled={mutation.isPending}
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
