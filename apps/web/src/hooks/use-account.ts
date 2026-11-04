import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { formatError } from "@/lib/client/errors";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

export type Provider = "twitter" | "discord";

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async ({ signal }) => {
    const result = await authClient.getSession({
      fetchOptions: {
        signal,
      },
    });
    if (result.error) {
      throw new Error(getAuthErrorMessage(result.error));
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
      throw new Error(getAuthErrorMessage(result.error));
    }
    return result.data;
  },
});

export type LinkedAccount = {
  id: string;
  providerId: Provider;
  accountId: string;
};

export function useUnlinkAccount(account: LinkedAccount) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.unlinkAccount({ accountId: account.id });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
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
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });
}
