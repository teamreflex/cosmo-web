/**
 * An error whose message browser code chose to show as it is, so
 * `formatError()` doesn't replace it. The message is usually a translated
 * string, but can be text a caller passed through, such as a Better Auth
 * response with no translation.
 */
export class LocalizedError extends Error {}
