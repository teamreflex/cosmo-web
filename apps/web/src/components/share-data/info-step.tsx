import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";

type Props = {
  onContinue: () => void;
};

export default function InfoStep({ onContinue }: Props) {
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      <p>{m.share_data_description({ appName: env.VITE_APP_NAME })}</p>
      <p>{m.share_data_explanation()}</p>
      <p>{m.share_data_privacy()}</p>

      <Button className="mx-auto mt-4 w-fit" onClick={onContinue}>
        {m.common_start()}
      </Button>
    </div>
  );
}
