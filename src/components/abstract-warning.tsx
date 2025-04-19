import { env } from "@/env";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export default function AbstractWarning() {
  return (
    <Alert variant="cosmo">
      <AlertTitle className="font-semibold">NOTE</AlertTitle>
      <AlertDescription>
        <p>
          {env.NEXT_PUBLIC_APP_NAME} profiles are still connected to the old
          Polygon network and addresses. Collections, COMO, progress and trades
          will remain empty.
        </p>
        <p>
          Objekt lists can still be viewed and exported with the Discord format
          function, but cannot be updated.
        </p>
      </AlertDescription>
    </Alert>
  );
}
