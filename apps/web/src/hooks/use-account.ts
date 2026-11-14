import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { formatError, LocalizedError } from "@/lib/client/errors";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as z from "zod";

export const providers = ["discord", "twitter"] as const;
export type Provider = (typeof providers)[number];

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async ({ signal }) => {
    const result = await authClient.getSession({
      fetchOptions: {
        signal,
      },
    });
    if (result.error) {
      throw new LocalizedError(getAuthErrorMessage(result.error));
    }
    return result.data?.user ?? null;
  },
});

export const listAccountsQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: async ({ signal }) => {
    const result = await authClient.listAccounts({
      fetchOptions: {
        signal,
      },
    });
    if (result.error) {
      throw new LocalizedError(getAuthErrorMessage(result.error));
    }
    return result.data;
  },
});

/**
 * A social account the account page can list. The credential account and an
 * account from a provider outside `providers` fail it.
 */
export const linkedAccountSchema = z.object({
  id: z.string(),
  providerId: z.enum(providers),
  accountId: z.string(),
});
export type LinkedAccount = z.infer<typeof linkedAccountSchema>;

export function useUnlinkAccount(account: LinkedAccount) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.unlinkAccount({ accountId: account.id });
      if (result.error) {
        throw new LocalizedError(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: listAccountsQuery.queryKey }),
    onError: (error) => {
      toast.error(formatError(error));
    },
  });
}

export function useLinkAccount(provider: Provider) {
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.linkSocial({
        provider: provider,
        errorCallbackURL: "/auth/error",
      });
      if (result.error) {
        throw new LocalizedError(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });
}
