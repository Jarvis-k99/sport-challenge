/**
 * Avatar pictures live in /public/avatars/<slug>.jpg (192×192, cropped to the
 * ring). The slug is the display name, lower-cased and stripped to a-z0-9, so
 * "Marlo" -> /avatars/marlo.jpg. To add a player: drop <slug>.jpg in there.
 * The originals (2048 px) are kept in src/avatars/ and are not shipped.
 */
export function avatarSlug(displayName: string): string {
  return displayName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function avatarUrl(displayName: string): string {
  return `/avatars/${avatarSlug(displayName)}.jpg`;
}
