function writeClientCookie(serializedCookie: string) {
  document.cookie = serializedCookie;
}

export function setClientCookie(key: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  writeClientCookie(`${key}=${encodeURIComponent(value)}; expires=${expires}; path=/`);
}

export function getClientCookie(key: string) {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : undefined;
}
