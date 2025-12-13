import {
  IconBrandDiscordFilled,
  IconBrandTwitterFilled,
  IconLink,
  IconLoader2,
  IconUnlink,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { LinkedAccount, Provider } from "@/hooks/use-account";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  listAccountsQuery,
  useLinkAccount,
  useUnlinkAccount,
} from "@/hooks/use-account";
import { m } from "@/i18n/messages";

export default function LinkedAccounts() {
  const { data } = useSuspenseQuery(listAccountsQuery);

  const oauthAccounts = data.filter(
    (account) => account.providerId !== "credential",
  );
  const providers = getProviders();
  const linkableProviders = Object.keys(providers).filter(
    (providerId) =>
      !oauthAccounts.map((account) => account.providerId).includes(providerId),
  );

  return (
    <div className="flex flex-col gap-2">
      {oauthAccounts.map((account) => (
        <LinkedAccountItem
          key={account.id}
          account={{
            id: account.id,
            providerId: account.providerId as LinkedAccount["providerId"],
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

  const providers = getProviders();
  const provider = providers[props.account.providerId];

  return (
    <div className="flex items-center gap-2">
      <provider.icon className="h-4 w-4 shrink-0" />
      <div className="flex grow items-center gap-2 text-sm">
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
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconUnlink />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {m.linked_accounts_unlink({ provider: provider.label })}
          </TooltipContent>
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

  const providers = getProviders();
  const provider = providers[props.providerId];

  return (
    <div className="flex items-center gap-2">
      <provider.icon className="h-4 w-4 shrink-0" />
      <div className="flex grow items-center gap-2 text-sm">
        <span>{m.linked_accounts_link({ provider: provider.label })}</span>
      </div>
      <Button
        size="icon"
        onClick={() => mutate()}
        disabled={status === "pending"}
      >
        {status === "pending" ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconLink />
        )}
      </Button>
    </div>
  );
}

function getProviders() {
  return {
    discord: {
      label: m.common_discord(),
      icon: IconBrandDiscordFilled,
    },
    twitter: {
      label: m.linked_accounts_twitter(),
      icon: IconBrandTwitterFilled,
    },
  };
}
