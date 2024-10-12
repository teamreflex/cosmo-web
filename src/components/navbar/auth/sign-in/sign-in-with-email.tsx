import { useState } from "react";
import SendEmailForm from "./email/send-email";
import ExchangeTokenForm from "./email/exchange-token";
import DecryptWallet from "./email/decrypt-wallet";
import { UserState } from "@/lib/client/wallet/util";
import { useConnect } from "wagmi";
import { ramper } from "@/lib/client/wallet/ramper-connector";
import { useRouter } from "next/navigation";

type SignInState = "sending-email" | "exchanging-token" | "decrypting-wallet";

export default function SignInWithEmail() {
  const [step, setStep] = useState<SignInState>("sending-email");
  const [payload, setPayload] = useState({
    transactionId: crypto.randomUUID(),
    email: "",
    pendingToken: "",
  });
  const [userState, setUserState] = useState<UserState>();
  const { connect, status } = useConnect();
  const router = useRouter();

  function onEmailSent(email: string, pendingToken: string) {
    setPayload((prev) => ({ ...prev, email, pendingToken }));
    setStep("exchanging-token");
  }

  function onTokenExchanged(userState: UserState) {
    setUserState(userState);
    connect(
      { connector: ramper(userState) },
      {
        onSuccess: () => {
          router.push(`/@${userState.nickname}`);
        },
      }
    );
    setStep("decrypting-wallet");
  }

  switch (step) {
    case "sending-email":
      return <SendEmailForm payload={payload} onComplete={onEmailSent} />;
    case "exchanging-token":
      return (
        <ExchangeTokenForm
          payload={payload}
          onBack={() => setStep("sending-email")}
          onComplete={onTokenExchanged}
        />
      );
    case "decrypting-wallet":
      if (!userState) {
        return <div>Loading...</div>;
      }
      return <DecryptWallet user={userState} status={status} />;
  }
}
