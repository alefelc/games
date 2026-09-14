/**
 * Stable pseudo-randomness scoped to a cryptographically random session ID.
 * Retries of the same draw keep the same order, while every new game receives
 * a different shuffle.
 */
export function sessionRandom(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  // Finalización con avalancha: IDs parecidos no deben producir valores
  // vecinos ni caer repetidamente en el mismo tramo del mazo ponderado.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0x1_0000_0000;
}
