import { DecryptCommand } from "@aws-sdk/client-kms";

const kmsRoutes = [
  {
    resourceUri: "arn:aws:kms:ap-northeast-2:299151497192:alias/kek",
    region: "ap-northeast-2",
  },
  {
    resourceUri: "arn:aws:kms:us-east-2:299151497192:alias/kek",
    region: "us-east-2",
  },
];

type BuildKMSAwsAlpha = {
  encryptedDek: Uint8Array;
  region: string;
  uid: string;
  creationTime: string;
};

export function buildKMSAwsAlpha({
  encryptedDek,
  region,
  uid,
  creationTime,
}: BuildKMSAwsAlpha) {
  let route = kmsRoutes.find((i) => i.region === region);
  if (!route) {
    route = kmsRoutes[0];
    console.warn("KMS Alpha: Falling back to first route");
  }

  return new DecryptCommand({
    KeyId: route.resourceUri,
    CiphertextBlob: encryptedDek,
    EncryptionAlgorithm: "SYMMETRIC_DEFAULT",
    EncryptionContext: {
      provider: uid,
      ct: creationTime,
    },
  });
}
