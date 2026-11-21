/**
 * Built-ins the app uses that are newer than some browsers still visiting:
 * Map.groupBy needs Safari 17.4, String isWellFormed needs Safari 16.4, and
 * Array toSorted and toReversed need Safari 16. Vite lowers syntax for its
 * build target but never adds missing built-ins.
 */

if (!("groupBy" in Map)) {
  Object.defineProperty(Map, "groupBy", {
    writable: true,
    configurable: true,
    value: function groupBy<K, T>(
      items: Iterable<T>,
      callback: (item: T, index: number) => K,
    ) {
      const groups = new Map<K, T[]>();
      let index = 0;
      for (const item of items) {
        const key = callback(item, index++);
        const group = groups.get(key);
        if (group === undefined) groups.set(key, [item]);
        else group.push(item);
      }
      return groups;
    },
  });
}

if (!("toSorted" in Array.prototype)) {
  Object.defineProperty(Array.prototype, "toSorted", {
    writable: true,
    configurable: true,
    value: function toSorted<T>(
      this: ArrayLike<T>,
      compareFn?: (a: T, b: T) => number,
    ) {
      return Array.from(this).sort(compareFn);
    },
  });
}

if (!("toReversed" in Array.prototype)) {
  Object.defineProperty(Array.prototype, "toReversed", {
    writable: true,
    configurable: true,
    value: function toReversed<T>(this: ArrayLike<T>) {
      return Array.from(this).reverse();
    },
  });
}

if (!("isWellFormed" in String.prototype)) {
  Object.defineProperty(String.prototype, "isWellFormed", {
    writable: true,
    configurable: true,
    /**
     * In `u` mode a valid surrogate pair reads as one astral code point, so
     * this class only matches a lone surrogate.
     */
    value: function isWellFormed(this: string) {
      return !/[\uD800-\uDFFF]/u.test(this);
    },
  });
}
