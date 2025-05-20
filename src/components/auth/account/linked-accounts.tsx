import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type LinkedAccount,
  type Provider,
  useLinkAccount,
  useListAccounts,
  useUnlinkAccount,
} from "@/hooks/use-account";
import {
  IconBrandDiscordFilled,
  IconBrandTwitterFilled,
} from "@tabler/icons-react";
import { Link, Loader2, Unlink } from "lucide-react";

export default function LinkedAccounts() {
  const { data } = useListAccounts();

  const oauthAccounts = data.filter(
    (account) => account.provider !== "credential"
  );
  const linkableProviders = Object.keys(providers).filter(
    (providerId) =>
      !oauthAccounts.map((account) => account.provider).includes(providerId)
  );

  return (
    <div className="flex flex-col gap-2">
      {oauthAccounts.map((account) => (
        <LinkedAccountItem
          key={account.id}
          account={{
            id: account.id,
            providerId: account.provider as LinkedAccount["providerId"],
            accountId: account.accountId,
          }}
          disabled={data.length === 1}
        />
      ))}

      {linkableProviders.map((providerId) => (
        <LinkNewAccount key={providerId} providerId={providerId as Provider} />
      ))}
    </div>
  );
}

type LinkedAccountItemProps = {
  account: LinkedAccount;
  disabled: boolean;
};

function LinkedAccountItem(props: LinkedAccountItemProps) {
  const { mutate, status } = useUnlinkAccount(props.account);

  const provider = providers[props.account.providerId];

  return (
    <div className="flex items-center gap-2">
      <provider.icon className="w-4 h-4 shrink-0" />
      <div className="flex items-center gap-2 text-sm grow">
        <span>{provider.label}</span>
        <span className="text-xs text-muted-foreground">
          {props.account.accountId}
        </span>
      </div>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => mutate()}
              disabled={status === "pending" || props.disabled}
            >
              {status === "pending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Unlink {provider.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

type LinkNewAccountProps = {
  providerId: Provider;
};

function LinkNewAccount(props: LinkNewAccountProps) {
  const { mutate, status } = useLinkAccount(props.providerId);

  const provider = providers[props.providerId];

  return (
    <div className="flex items-center gap-2">
      <provider.icon className="w-4 h-4 shrink-0" />
      <div className="flex items-center gap-2 text-sm grow">
        <span>Link {provider.label}</span>
      </div>
      <Button
        size="icon"
        onClick={() => mutate()}
        disabled={status === "pending"}
      >
        {status === "pending" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Link />
        )}
      </Button>
    </div>
  );
}

const providers = {
  discord: {
    label: "Discord",
    icon: IconBrandDiscordFilled,
  },
  twitter: {
    label: "Twitter",
    icon: IconBrandTwitterFilled,
  },
};
