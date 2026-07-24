/**
 * Los códigos de vinculación se transportan en el fragmento de la URL para que
 * no viajen a servidores, proxies, analítica ni cabeceras Referer. Se mantiene
 * lectura temporal desde query para no romper invitaciones antiguas.
 */
export function readCoupleCodeFromLocation(
  location: Pick<Location, "search" | "hash"> = window.location,
): string {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const fragmentCode = new URLSearchParams(hash).get("couple_code")?.trim();
  if (fragmentCode) return fragmentCode;
  return new URLSearchParams(location.search).get("couple_code")?.trim() ?? "";
}

export function clearCoupleCodeFromLocation(
  location: Location = window.location,
  history: History = window.history,
): void {
  const url = new URL(location.href);
  url.searchParams.delete("couple_code");

  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  fragment.delete("couple_code");
  const nextHash = fragment.toString();
  url.hash = nextHash ? `#${nextHash}` : "";

  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
