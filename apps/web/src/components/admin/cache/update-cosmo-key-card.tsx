import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { $setCosmoKey } from "@/lib/functions/cache";
import { cosmoKeyStatusQuery } from "@/lib/queries/admin";
import { cosmoKeySchema } from "@/lib/universal/schema/cosmo-key";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconKey, IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type FormValues = z.infer<typeof cosmoKeySchema>;

export default function UpdateCosmoKeyCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery(cosmoKeyStatusQuery);

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(cosmoKeySchema),
    defaultValues: { key: "" },
  });

  const mutation = useMutation({
    mutationFn: $setCosmoKey,
    onSuccess: () => {
      toast.success(m.admin_cache_key_saved());
      form.reset();
      void queryClient.invalidateQueries({
        queryKey: cosmoKeyStatusQuery.queryKey,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  function handleSubmit(data: FormValues) {
    mutation.mutate({ data });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_cache_key_title()}</CardTitle>
        <CardDescription>{m.admin_cache_key_description()}</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {statusQuery.data?.source === "redis"
              ? m.admin_cache_key_source_redis()
              : m.admin_cache_key_source_env()}
          </p>
          <Controller
            control={form.control}
            name="key"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cosmo-key">
                  {m.admin_cache_key_label()}
                </FieldLabel>
                <Input
                  id="cosmo-key"
                  placeholder={m.admin_cache_key_placeholder()}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconKey className="size-4" />
            )}
            <span>{m.admin_cache_key_save()}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
