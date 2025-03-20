"use client";

import { decryptMnemonic } from "@/lib/client/wallet/decryption";
import {
  MutationOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createWalletClient, Hex, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { env } from "@/env";
import type { DecryptRamperWallet } from "@/lib/client/wallet/exchange";
import { EncryptedWallet } from "@/lib/client/wallet/util";

const STORAGE_KEY = "wallet";
const QUERY_KEY = [STORAGE_KEY];

export interface UserState extends DecryptRamperWallet {
  nickname: string;
}

export function useWallet() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        var encrypted = loadWallet();
      } catch (err) {
        if (err instanceof WalletError) {
          localStorage.removeItem(STORAGE_KEY);
          throw err;
        }
        return null;
      }

      if (!encrypted) {
        return null;
      }

      return await decrypt(encrypted);
    },
    retry: false,
    staleTime: Infinity,
  });
  const mutation = useMutation({
    mutationKey: ["exchange-kms"],
    mutationFn: async (credentials: UserState): Promise<EncryptedWallet> => {
      // lazy load all the firebase and KMS stuff
      const exchangeKMS = await import("@/lib/client/wallet/exchange").then(
        (mod) => mod.exchangeKMS
      );
      return exchangeKMS(credentials);
    },
    onSuccess: async (encrypted, variables) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
      const wallet = await decrypt(encrypted);
      queryClient.setQueryData(QUERY_KEY, wallet);
    },
  });

  /**
   * Fetch wallet and decrypt it.
   */
  function connect(
    credentials: UserState,
    opts?: MutationOptions<EncryptedWallet, Error, UserState>
  ) {
    mutation.mutate(credentials, opts);
  }

  /**
   * Wipe the currently loaded wallet from localStorage.
   */
  function disconnect() {
    localStorage.removeItem(STORAGE_KEY);
    queryClient.setQueryData(QUERY_KEY, null);
  }

  return {
    wallet: query.data,
    walletStatus: query.status,
    hasWallet: query.data !== null && query.data !== undefined,
    connect,
    connectStatus: mutation.status,
    disconnect,
  };
}

/**
 * Load the encrypted wallet from localStorage.
 */
function loadWallet() {
  const encryptedWallet = localStorage.getItem(STORAGE_KEY);
  if (!encryptedWallet) {
    return;
  }

  try {
    var json = JSON.parse(encryptedWallet);
  } catch (err) {
    throw new WalletParseError();
  }

  const isValid =
    typeof json.decryptedDek === "string" &&
    typeof json.encryptedKey === "string" &&
    typeof json.version === "number";
  if (!isValid) {
    throw new WalletStructureError();
  }

  return json as EncryptedWallet;
}

/**
 * Decrypts the given wallet and returns a Viem account.
 */
async function decrypt(encrypted: EncryptedWallet) {
  const mnemonic = await decryptMnemonic(encrypted);
  const account = mnemonicToAccount(mnemonic as Hex);

  console.log("wallet decrypted");
  return createWalletClient({
    account,
    chain: polygon,
    transport: http(`https://polygon-mainnet.g.alchemy.com/v2`, {
      batch: true,
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${env.NEXT_PUBLIC_ALCHEMY_KEY}`,
        },
      },
    }),
  });
}

class WalletError extends Error {}
export class WalletMissingError extends WalletError {}
export class WalletParseError extends WalletError {}
export class WalletStructureError extends WalletError {}
