import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { IconCircleCheck } from "@tabler/icons-react";

type Props = {
  updated: number;
};

export default function DoneStep({ updated }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <IconCircleCheck className="size-12 text-green-500" />
      <p className="text-sm text-muted-foreground">
        {m.share_data_success({ count: updated })}
      </p>
      <p className="text-xs text-muted-foreground">
        {m.share_data_thanks({ appName: env.VITE_APP_NAME })}
      </p>
    </div>
  );
}
