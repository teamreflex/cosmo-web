# Frontend — Components, Forms, Styling & i18n

## Components

### Naming & Organization

- File names use `kebab-case.tsx`
- Organize by domain in `components/{feature}/`
- Shared UI components in `components/ui/` (from shadcn/ui)

### UI Library

The project uses [shadcn/ui](https://ui.shadcn.com/) components built on [Radix UI](https://www.radix-ui.com/) primitives with [Tabler Icons](https://tabler.io/icons).

If you need a component that doesn't exist in the codebase, you can likely add it from the shadcn library. Use the shadcn CLI or copy the component code from their documentation.

### Structure Pattern

```tsx
type Props = {
  // props
};

export default function ComponentName(props: Props) {
  // hooks at top
  // handlers
  return (/* JSX */);
}

// Sub-components below if needed
function SubComponent() {}
```

## Forms

Use `react-hook-form` with `@hookform/resolvers/standard-schema` for Zod validation:

```tsx
import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

const form = useForm({
  resolver: standardSchemaResolver(schema),
  defaultValues: {},
});

function handleSubmit(data: z.infer<typeof schema>) {
  mutation.mutate(data, {
    onSuccess: () => toast.success("Success!"),
    onError: (error) => toast.error(error.message),
  });
}

return (
  <form onSubmit={form.handleSubmit(handleSubmit)}>
    <Controller
      control={form.control}
      name="fieldName"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>Label</FieldLabel>
          <Input {...field} />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
    <Button type="submit" disabled={mutation.isPending}>
      Submit
    </Button>
  </form>
);
```

Gate bad input on the **client** with RHF — keep server-fn validators strict rather than loosening them to absorb bad input. Prefer `useForm` + `standardSchemaResolver` over raw `useState` dialogs. Use plain-English `.refine` messages (not i18n); a row-level `.refine` maps its path to `rows.${i}.field`.

**Schema reuse:** default to using the server fn's own Zod schema as the RHF resolver — seed `defaultValues` with the full payload (identity fields like `slug`/`tokenId` ride along un-edited), bind inputs to the real paths (`entries.${i}.price`), and submit `data` straight through. One schema, validated both sides. Only use a bespoke client schema when the form is a genuinely different *shape* than the request (e.g. a selection subset); even then, extract the shared per-field rule to one source (e.g. a `salePriceSchema` imported by both).

**Hook variables, not closures:** when a shared mutation hook needs form values, make its `mutationFn` generic over `TVariables` (default `void`) and pass validated values via `form.handleSubmit(async (values) => mutation.mutateAsync(values))` — don't read `form.getValues()` inside a no-arg thunk.

## Tailwind

The project uses Tailwind v4, so always use v4 conventions rather than v3. This includes things like:

- supporting inline CSS variable usage such as `bg-(--my-var)` vs. `bg-[var(--my-var)]`
- using CSS configuration in `styles/tailwind.css` rather than `tailwind.config.js`
- `oklch` colors instead of `hsl`
- Standard shadcn/ui color tokens apply.

`@theme inline` collapses `var()` chains at build time. For tokens you want to override at runtime via JS or `:root`, declare them in a **non-inline** `@theme` block so utilities keep emitting `var(--your-token)`. Verify by checking the built CSS — the utility must reference your token, not the underlying one.

### Component Variants

Use [Class Variance Authority (CVA)](https://cva.style/docs) for variant-based components:

```tsx
import { cva } from "class-variance-authority";

const variants = cva({
  base: "base-classes",
  variants: {
    size: {
      sm: "text-sm px-2 py-1",
      md: "text-base px-4 py-2",
      lg: "text-lg px-6 py-3",
    },
    variant: {
      primary: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "primary",
  },
});
```

### Common Patterns

- Combine classes with `cn()` utility from `lib/utils.ts`
- Use data attributes for state: `data-[state=active]:bg-muted`
- Photocard aspect ratio: `aspect-photocard`

## i18n

- When writing new components that include strings, always use the i18n system and create new strings for all languages in `messages/`.
- Use `turbo i18n` to compile messages into `.js` modules for use with the `m()` helper.
- After merging a branch that added `messages/*.json` keys, run `bun run i18n` before typechecking. `src/i18n/messages` is gitignored Paraglide output, so a plain text-merge leaves the compiled `m.*` stale and typecheck fails with TS2339.
