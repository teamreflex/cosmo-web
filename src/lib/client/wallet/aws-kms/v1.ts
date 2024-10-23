import { DecryptCommand } from "@aws-sdk/client-kms";
import { UnknownRegion } from "./common";

const kmsRoutes = [
  {
    resourceUri: "arn:aws:kms:us-east-1:299151497192:alias/kek00",
    region: "us-east-1",
  },
  {
    resourceUri: "arn:aws:kms:ap-northeast-2:299151497192:alias/mkek00",
    region: "ap-northeast-2",
  },
];

type BuildKMSAwsV1 = {
  encryptedDek: Uint8Array;
  region: string;
  pool: string;
};

export function buildKMSAwsV1({ encryptedDek, region, pool }: BuildKMSAwsV1) {
  const route = kmsRoutes.find((i) => i.region === region);
  if (!route) {
    throw new UnknownRegion(`Unknown KMS v1 route for region "${region}"`);
  }

  return new DecryptCommand({
    KeyId: `${route.resourceUri}${pool}`,
    CiphertextBlob: encryptedDek,
    EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
  });
}
