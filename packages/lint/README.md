# @apollo/lint

The base oxlint config every workspace extends (`oxlint.config.ts`), and `anti-slop`, a local JS plugin of type-evidence rules (`anti-slop/`). How workspaces extend the base, suppress a rule and run lint is in [`docs/tooling.md`](../../docs/tooling.md#lint).

## Why anti-slop exists

The rules enforce one idea: parse input once at its I/O boundary into a named type, then keep the types TypeScript infers. Assertions, `unknown` parameters and `typeof` checks are the usual ways code skips that parse, so each rule refuses one of them. Fix a failure by parsing (zod or Effect `Schema`) or by naming the owner's type, not by suppressing the rule.

## Rules

Every rule is an error. The rules aren't on oxc.rs; their messages and docs live in `anti-slop/rules/`.

| Rule                                        | Refuses                                                                           | Do instead                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `require-safety-comment-for-type-assertion` | an `as` or `<T>` assertion (other than `as const`) without a `SAFETY:` comment    | state the checked invariant in a `// SAFETY:` comment right before the assertion or its statement |
| `no-chained-type-assertions`                | `x as unknown as T` and other chains                                              | keep the precise type, or parse the value                                                         |
| `no-widen-then-assert`                      | a `const` given a broad type, later asserted back to a narrow one                 | keep the precise type from initialisation on                                                      |
| `no-known-value-widening`                   | an explicit broad type annotation on a value whose type is already known          | let inference keep it, or check it with `satisfies`                                               |
| `no-unknown-parameters`                     | a parameter typed `unknown`, except one named `cause`                             | accept a domain type and parse before the call                                                    |
| `no-object-parameters`                      | a parameter typed `object`                                                        | accept a named type                                                                               |
| `no-unknown-returns`                        | a function declared to return `unknown` or `Promise<unknown>`                     | parse inside and return a named type                                                              |
| `no-unknown-type-aliases`                   | a type alias that resolves to `unknown`                                           | keep `unknown` visible where it is parsed                                                         |
| `no-unsafe-dictionary-type`                 | a `Record` or index signature whose values are `unknown`, `any`, `object` or `{}` | a schema-derived value type                                                                       |
| `no-runtime-typeof`                         | any `typeof` expression in runtime code                                           | decode the value at its boundary, then branch on the domain value                                 |
| `no-reflect-get`, `no-reflect-apply`        | `Reflect.get` and `Reflect.apply`                                                 | typed property access or a typed call                                                             |
| `no-conditional-empty-object-spread`        | `...(cond ? { a } : {})`, a ternary with an empty object on either side           | build the object, then set the property when it is present                                        |
| `no-module-mocking`                         | `vi.mock`, `jest.mock` and the other module mocks                                 | pass a real dependency through an interface or layer                                              |
| `no-shape-in-symbol-names`                  | "shape" anywhere in a symbol name, any case                                       | name it for its domain role                                                                       |

- A genuinely unavoidable case, such as an injected page global or a thrown value, gets a suppression comment naming the rule and the reason: `// oxlint-disable-next-line anti-slop/no-runtime-typeof -- grecaptcha is an injected page global`.
- A vendored directory is exempted through an `overrides` entry in the workspace config, as `apps/web` does for `src/components/ui/**`.

## Adding a rule

1. Write it in `anti-slop/rules/<name>.ts` with `defineRule()` from `@oxlint/plugins`, with a `docs.description` and a message that says what to do instead.
2. Register it in the plugin in `anti-slop/index.ts`.
3. Turn it on under `rules` in `oxlint.config.ts`.
4. Add it to the `src/components/ui/**` override in `apps/web/oxlint.config.ts`.
5. Run `turbo lint` and fix or suppress what it finds.

- Nothing lints the rules themselves: this package has no `lint` script, and the base config ignores `anti-slop/**`.
