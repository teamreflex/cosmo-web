import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { queryOptions, useMutation } from "@tanstack/react-query";

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
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.unlinkAccount(account);
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });
}

export function useLinkAccount(provider: Provider) {
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.linkSocial({
        provider: provider,
      });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.deleteUser();
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });
}
