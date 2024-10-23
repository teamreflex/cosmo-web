import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import {
  getAuth,
  setPersistence,
  inMemoryPersistence,
  signInWithCustomToken,
} from "firebase/auth";
import { env } from "@/env.mjs";

const config = {
  apiKey: env.NEXT_PUBLIC_RAMPER_FIREBASE_KEY,
  projectId: "ramper-prod",
  databaseURL: "https://ramper-prod-default-rtdb.firebaseio.com",
  appId: env.NEXT_PUBLIC_RAMPER_FIREBASE_ID,
  storageBucket: "ramper-prod.appspot.com",
};

type FetchPrivateKey = {
  socialLoginUserId: string;
  customToken: string;
  address: string;
};

type FirebaseResult = {
  firebase: {
    token: string;
    creationTime: string;
  };
  aws: {
    uid: string;
    identityPoolUri: string;
    region: string;
  };
  wallet: {
    address: string;
    version: number;
    encryptedKey: string;
    encryptedDek: Uint8Array;
  };
};

/**
 * Log into Firebase and retrieve the encrypted wallet.
 */
export async function fetchPrivateKey({
  socialLoginUserId,
  customToken,
  address,
}: FetchPrivateKey): Promise<FirebaseResult> {
  // setup firebase
  const app = initializeApp(config);
  const firestore = getFirestore(app);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);

  // sign in
  const { user } = await signInWithCustomToken(auth, customToken);

  // fetch wallet document
  const walletKeysSnapshot = await getDocs(
    collection(
      firestore,
      "users",
      socialLoginUserId,
      "walletList",
      "default",
      "walletkey"
    )
  );

  // parse document
  const ethereumWallet = walletKeysSnapshot.docs.find((doc) => {
    const walletId: string = doc.data().walletId;
    return walletId.includes("ethereum");
  });
  if (!ethereumWallet) {
    throw new Error("No ethereum wallet found");
  }

  const data = ethereumWallet.data();
  const identityPoolUri =
    data.fiUri ?? "us-east-1:662b2574-190f-4e2a-be17-1ae5ee8d88a4";
  const [region] = identityPoolUri.split(":");

  return {
    firebase: {
      token: await user.getIdToken(),
      creationTime: user.metadata.creationTime ?? "",
    },
    aws: {
      uid: user.providerData[0].uid,
      identityPoolUri,
      region,
    },
    wallet: {
      address,
      version: data.version,
      encryptedKey: data.encryptedKey,
      encryptedDek: data.dek.toUint8Array(),
    },
  };
}
