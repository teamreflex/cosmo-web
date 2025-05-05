import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function useListAccounts() {
  return useSuspenseQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });
}

export type LinkedAccount = {
  id: string;
  providerId: "discord" | "twitter";
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
