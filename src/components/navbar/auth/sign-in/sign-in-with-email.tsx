import { useState } from "react";
import SendEmailForm from "./email/send-email";
import ExchangeTokenForm from "./email/exchange-token";
import DecryptWallet from "./email/decrypt-wallet";
import { useRouter } from "next/navigation";
import { UserState, useWallet } from "@/hooks/use-wallet";

type SignInState = "sending-email" | "exchanging-token" | "decrypting-wallet";

export default function SignInWithEmail() {
  const [step, setStep] = useState<SignInState>("sending-email");
  const [payload, setPayload] = useState({
    transactionId: crypto.randomUUID(),
    email: "",
    pendingToken: "",
  });
  const [userState, setUserState] = useState<UserState>();
  const { connect, connectStatus } = useWallet();
  const router = useRouter();

  function onEmailSent(email: string, pendingToken: string) {
    setPayload((prev) => ({ ...prev, email, pendingToken }));
    setStep("exchanging-token");
  }

  function onTokenExchanged(userState: UserState) {
    setUserState(userState);
    connect(userState, {
      onSuccess: () => {
        router.push(`/@${userState.nickname}`);
      },
    });
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
      return <DecryptWallet user={userState} status={connectStatus} />;
  }
}
