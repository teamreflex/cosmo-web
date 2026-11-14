import { IconLoader2 } from "@tabler/icons-react";
import { useFormState } from "react-hook-form";
import { Button } from "./ui/button";

type Props = {
  label: string;
};

/**
 * The submit button of the form whose `FormProvider` it sits in: disabled,
 * with a spinner, while the form submits.
 */
export default function SubmitButton({ label }: Props) {
  const { isSubmitting } = useFormState();

  return (
    <Button type="submit" disabled={isSubmitting}>
      <span>{label}</span>
      {isSubmitting && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
