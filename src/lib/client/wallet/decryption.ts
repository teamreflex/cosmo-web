import { DecryptCommand, KMSClient } from "@aws-sdk/client-kms";
import { fetchCredentials } from "./aws-cognito";
import { fetchPrivateKey } from "./firebase";
import { UnknownWalletVersion } from "./aws-kms/common";
import { buildKMSAwsAlpha } from "./aws-kms/alpha";
import { buildKMSAwsV1 } from "./aws-kms/v1";
import { buildKMSAwsV1_1 } from "./aws-kms/v1_1";

export type DecryptRamperWallet = {
  socialLoginUserId: string;
  customToken: string;
  address: string;
};

/**
 * Uses AWS KMS to retrieve the decrypted wallet.
 */
export async function exchangeKMS({
  socialLoginUserId,
  customToken,
  address,
}: DecryptRamperWallet): Promise<EncryptedWallet> {
  // fetch document from Firebase
  const { firebase, aws, wallet } = await fetchPrivateKey({
    socialLoginUserId,
    customToken,
    address,
  });

  // fetch credentials from AWS Cognito
  const { identityId, pool, credentials } = await fetchCredentials({
    firebaseUid: aws.uid,
    firebaseToken: firebase.token,
    identityPoolUri: aws.identityPoolUri,
    region: aws.region,
  });

  let command: DecryptCommand;
  // use ramper fallback/defaults where possible
  let region: string;

  if (wallet.version === 3.1) {
    region = "ap-northeast-2";
    command = buildKMSAwsAlpha({
      encryptedDek: wallet.encryptedDek,
      region,
      uid: aws.uid,
      creationTime: firebase.creationTime,
    });
  } else if (wallet.version >= 7) {
    region = "us-east-2";
    command = buildKMSAwsV1_1({
      encryptedDek: wallet.encryptedDek,
      region,
      pool,
      uid: aws.uid,
      creationTime: firebase.creationTime,
      identityId,
    });
  } else if (wallet.version < 6) {
    region = "us-east-1";
    command = buildKMSAwsV1({
      encryptedDek: wallet.encryptedDek,
      region,
      pool,
    });
  } else if (wallet.version < 7) {
    region = "ap-northeast-2";
    command = buildKMSAwsV1({
      encryptedDek: wallet.encryptedDek,
      region,
      pool,
    });
  } else {
    throw new UnknownWalletVersion();
  }

  const kms = new KMSClient({
    region,
    credentials,
  });

  const result = await kms.send(command);
  const decryptedDek = new TextDecoder().decode(result.Plaintext);

  return {
    address,
    decryptedDek: decryptedDek,
    encryptedKey: wallet.encryptedKey,
    version: wallet.version,
  };
}

export type EncryptedWallet = {
  decryptedDek: string;
  encryptedKey: string;
  version: number;
  address: string;
};

/**
 * Decrypt key for use with Viem.
 */
export async function decryptMnemonic({
  decryptedDek,
  encryptedKey,
  version,
}: EncryptedWallet) {
  if (version === 3.1) {
    const derivedDek = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(decryptedDek),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // hex
    const salt = hexToBytes(encryptedKey.substring(0, 32));
    const iv = hexToBytes(encryptedKey.substring(32, 64));
    // base64
    const encryptedBytes = base64ToBytes(encryptedKey.substring(64));

    const derivedKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-1", iterations: 1e3, salt },
      derivedDek,
      { name: "AES-CBC", length: 256 },
      false,
      ["decrypt"]
    );

    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        derivedKey,
        encryptedBytes
      )
    );
  }

  // TODO: check if version 6 is different
  const encryptedBytes = base64ToBytes(encryptedKey);
  const decryptedKey = await crypto.subtle.importKey(
    "raw",
    hexToBytes(decryptedDek),
    "AES-CBC",
    false,
    ["decrypt"]
  );

  // doesn't appear to have anything prepended
  const iv = new Uint8Array(16);

  return new TextDecoder().decode(
    hexToBytes(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: "AES-CBC", iv },
          decryptedKey,
          encryptedBytes
        )
      )
    )
  );
}

function hexToBytes(hex: string) {
  return new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

function base64ToBytes(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
