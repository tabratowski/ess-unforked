const DEFAULT_OWNER = "tomasz.abratowski@gmail.com";

export function isOwner(email: string | undefined | null): boolean {
  if (!email) return false;
  const owner = (process.env.OWNER_EMAIL || DEFAULT_OWNER).trim().toLowerCase();
  return email.trim().toLowerCase() === owner;
}
