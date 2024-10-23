import {
  fromCognitoIdentityPool,
  fromTemporaryCredentials,
} from "@aws-sdk/credential-providers";

type FetchCredentials = {
  firebaseUid: string;
  firebaseToken: string;
  identityPoolUri: string;
  region: string;
};

/**
 * Exchange Firebase token with AWS Cognito.
 */
export async function fetchCredentials({
  firebaseUid,
  firebaseToken,
  identityPoolUri,
  region,
}: FetchCredentials) {
  const masterCredentials = await fromCognitoIdentityPool({
    logins: {
      "securetoken.google.com/ramper-prod": firebaseToken,
    },
    identityPoolId: identityPoolUri,
    clientConfig: { region },
    userIdentifier: firebaseUid,
  })();

  const identityId = masterCredentials.identityId;
  const pool = identityId.charAt(identityId.length - 1);

  const credentials = await fromTemporaryCredentials({
    masterCredentials,
    params: {
      RoleArn: `arn:aws:iam::299151497192:role/cognito-pool-${pool}`,
      DurationSeconds: 900,
    },
    clientConfig: { region },
  })();

  return {
    identityId,
    pool,
    credentials,
  };
}
