import { cn } from "@/lib/utils";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperTitle,
  StepperTrigger,
} from "../ui/stepper";
import { useObjektSpin } from "@/hooks/use-objekt-spin";

const steps = [
  {
    value: 1,
    title: "Select",
    enableBack: true,
    enableJumpTo: true,
  },
  {
    value: 2,
    title: "Send",
    enableBack: true,
    enableJumpTo: false,
  },
  {
    value: 3,
    title: "Spin",
    enableBack: false,
    enableJumpTo: false,
  },
];

export default function SpinStepper() {
  const currentStep = useObjektSpin((state) => state.currentStep);

  function handleTrigger(step: (typeof steps)[number]) {
    const current = steps.find((s) => s.value === currentStep);
    if (!current) return;

    const next = steps.find((s) => s.value === step.value);
    if (!next) return;

    // prevent going back when not allowed
    if (current.value > next.value && current.enableBack) {
      // onStepChange(next.value);
    }

    // prevent jumping to a step that is not allowed
    if (next.value > currentStep && next.enableJumpTo) {
      // onStepChange(next.value);
    }
  }

  return (
    <Stepper value={currentStep} className="items-start gap-4">
      {steps.map((step) => (
        <StepperItem key={step.value} step={step.value} className="flex-1">
          <StepperTrigger
            className={cn(
              "w-full flex-col items-start gap-2 rounded",
              step.enableJumpTo && "cursor-pointer"
            )}
            onClick={() => handleTrigger(step)}
          >
            <StepperIndicator asChild className="bg-border h-1 w-full">
              <span className="sr-only">{step.title}</span>
            </StepperIndicator>
            <div className="space-y-0.5">
              <StepperTitle>{step.title}</StepperTitle>
            </div>
          </StepperTrigger>
        </StepperItem>
      ))}
    </Stepper>
  );
}
