import { DecryptCommand, KMSClient } from "@aws-sdk/client-kms";
import { fetchCredentials } from "./aws-cognito";
import { fetchPrivateKey } from "./firebase";
import { UnknownWalletVersion } from "./aws-kms/common";
import { buildKMSAwsAlpha } from "./aws-kms/alpha";
import { buildKMSAwsV1 } from "./aws-kms/v1";
import { buildKMSAwsV1_1 } from "./aws-kms/v1_1";
import { EncryptedWallet } from "./util";

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
