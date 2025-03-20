import { useState } from "react";
import SendEmailForm from "./email/send-email";
import ExchangeTokenForm from "./email/exchange-token";
import DecryptWallet from "./email/decrypt-wallet";
import { UserState, useWallet } from "@/hooks/use-wallet";
import { match } from "ts-pattern";
import { useRouter } from "next/navigation";

type SignInState = "sending-email" | "exchanging-token" | "decrypting-wallet";

type Props = {
  onComplete: () => void;
};

export default function SignInWithEmail({ onComplete }: Props) {
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
        onComplete();
      },
    });
    setStep("decrypting-wallet");
  }

  return match(step)
    .with("sending-email", () => (
      <SendEmailForm payload={payload} onComplete={onEmailSent} />
    ))
    .with("exchanging-token", () => (
      <ExchangeTokenForm
        payload={payload}
        onBack={() => setStep("sending-email")}
        onComplete={onTokenExchanged}
      />
    ))
    .with("decrypting-wallet", () => (
      <DecryptWallet user={userState} status={connectStatus} />
    ))
    .exhaustive();
}
