import {
  Address,
  createPublicClient,
  createWalletClient,
  Hex,
  PublicClient,
  WalletClient,
  nonceManager,
} from "viem";
import { createConnector } from "wagmi";
import { polygon } from "wagmi/chains";
import { alchemyHttpTransport } from "./alchemy";
import {
  loadWallet,
  STORAGE_KEY,
  WalletParseError,
  WalletStructureError,
} from "@/lib/client/wallet/util";
import { decryptMnemonic, EncryptedWallet, exchangeKMS } from "./decryption";
import { mnemonicToAccount } from "viem/accounts";

export type RamperConnectorParams = {
  socialLoginUserId: string;
  customToken: string;
  address: string;
};

export function ramper(params?: RamperConnectorParams) {
  let provider: PublicClient | undefined;
  let client: WalletClient | undefined;

  return createConnector<PublicClient>((config) => ({
    id: "ramper",
    name: "Ramper",
    supportsSimulation: false,
    type: "ramper" as const,

    async connect() {
      let wallet: EncryptedWallet | undefined = undefined;

      try {
        wallet = loadWallet();
      } catch (err) {
        if (
          err instanceof WalletParseError ||
          err instanceof WalletStructureError
        ) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (!wallet) {
        if (!params) {
          console.warn("cannot reconnect with empty storage");
          return {
            accounts: [],
            chainId: polygon.id,
          };
        }

        wallet = await exchangeKMS(params);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
      }

      return {
        accounts: [wallet.address as Address],
        chainId: polygon.id,
      };
    },
    async disconnect() {
      client = undefined;
      localStorage.removeItem(STORAGE_KEY);
    },
    async getAccounts() {
      try {
        const wallet = loadWallet();
        return [wallet.address as Address];
      } catch (err) {
        return [];
      }
    },
    async getChainId() {
      return polygon.id;
    },
    async getClient() {
      if (!client) {
        try {
          var encryptedWallet = loadWallet();
        } catch (err) {
          throw new Error("Wallet not found");
        }

        const mnemonic = await decryptMnemonic(encryptedWallet);
        const account = mnemonicToAccount(mnemonic as Hex, {
          nonceManager,
        });

        client = createWalletClient({
          account,
          chain: polygon,
          transport: alchemyHttpTransport,
        });
      }

      return client;
    },
    async getProvider() {
      if (!provider) {
        provider = createPublicClient({
          chain: polygon,
          transport: alchemyHttpTransport,
        });
      }

      return provider;
    },
    async isAuthorized() {
      try {
        loadWallet();
        return true;
      } catch (err) {
        return false;
      }
    },
    onAccountsChanged: (accounts: string[]) => {
      //
    },
    onChainChanged: (chainId: string) => {
      //
    },
    onDisconnect: (error?: Error | undefined) => {
      //
    },
  }));
}
