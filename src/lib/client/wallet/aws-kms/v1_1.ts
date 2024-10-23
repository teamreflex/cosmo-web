import { DecryptCommand } from "@aws-sdk/client-kms";

const kmsRoutes = [
  {
    resourceUri: "arn:aws:kms:us-east-2:299151497192:alias/skek00",
    region: "us-east-2",
  },
  {
    resourceUri: "arn:aws:kms:ap-northeast-2:299151497192:alias/skek00",
    region: "ap-northeast-2",
  },
];

type BuildKMSAwsV1_1 = {
  encryptedDek: Uint8Array;
  region: string;
  pool: string;
  uid: string;
  creationTime: string;
  identityId: string;
};

export function buildKMSAwsV1_1({
  encryptedDek,
  region,
  pool,
  uid,
  creationTime,
  identityId,
}: BuildKMSAwsV1_1) {
  let route = kmsRoutes.find((i) => i.region === region);
  if (!route) {
    route = kmsRoutes[0];
    console.warn("KMS v1.1: Falling back to first route");
  }

  return new DecryptCommand({
    KeyId: `${route.resourceUri}${pool}`,
    CiphertextBlob: encryptedDek,
    EncryptionAlgorithm: "SYMMETRIC_DEFAULT",
    EncryptionContext: {
      provider: uid,
      ct: creationTime,
      cred: identityId,
    },
  });
}
