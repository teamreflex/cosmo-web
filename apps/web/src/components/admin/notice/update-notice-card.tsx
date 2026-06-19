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
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $setNotice } from "@/lib/functions/notice";
import { noticeQuery } from "@/lib/queries/notice";
import { noticeSchema } from "@/lib/universal/schema/notice";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

export default function UpdateNoticeCard() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(noticeQuery);

  const form = useForm({
    resolver: standardSchemaResolver(noticeSchema),
    defaultValues: { message: "" },
    values: { message: data ?? "" },
  });

  const mutation = useMutation({
    mutationFn: $setNotice,
    onSuccess: () => {
      toast.success(m.admin_notice_saved());
      void queryClient.invalidateQueries({ queryKey: noticeQuery.queryKey });
    },
    onError: (error) => toast.error(formatError(error)),
  });

  function handleSubmit(data: z.infer<typeof noticeSchema>) {
    mutation.mutate({ data });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_notice_title()}</CardTitle>
        <CardDescription>{m.admin_notice_description()}</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <CardContent className="flex flex-col gap-3">
          <Controller
            control={form.control}
            name="message"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="notice-message">
                  {m.admin_notice_label()}
                </FieldLabel>
                <Textarea
                  id="notice-message"
                  placeholder={m.admin_notice_placeholder()}
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
              <IconDeviceFloppy className="size-4" />
            )}
            <span>{m.admin_notice_save()}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
