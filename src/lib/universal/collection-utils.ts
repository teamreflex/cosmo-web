/**
 * Parses the grid edition subtitle into its valid collection numbers.
 * "1st Edition | 101-108" -> [101, 102, 103, 104, 105, 106, 107, 108]
 * @param subtitle string
 */
export function parseEdition(subtitle: string) {
  const match = subtitle.match(/(\d+)-(\d+)/);

  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  return [];
}
