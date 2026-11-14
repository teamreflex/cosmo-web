/**
 * What a URL-filter setter takes: the keys to change, or a function that
 * derives them from the current filters.
 */
export type FilterUpdate<T> = Partial<T> | ((prev: T) => Partial<T>);

/**
 * The next value of a setState-style update, calling it with the previous
 * value when it is an updater function.
 */
export function resolveUpdate<TPrev, TNext>(
  input: TNext | ((prev: TPrev) => TNext),
  prev: TPrev,
) {
  return input instanceof Function ? input(prev) : input;
}
