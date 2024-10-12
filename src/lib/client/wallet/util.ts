import { EncryptedWallet } from "@/lib/client/wallet/decryption";

export const STORAGE_KEY = "wallet";

export type UserState = {
  nickname: string;
  address: string;
  customToken: string;
  socialLoginUserId: string;
};

/**
 * Load the encrypted wallet from localStorage.
 */
export function loadWallet() {
  const encryptedWallet = localStorage.getItem(STORAGE_KEY);
  if (!encryptedWallet) {
    throw new WalletMissingError();
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

export class WalletMissingError extends Error {}
export class WalletParseError extends Error {}
export class WalletStructureError extends Error {}
