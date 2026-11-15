export function typeLabel(type) {
  return type === "TV_SHOW" ? "TV show" : "Movie";
}

export function releaseYear(releaseDate) {
  return releaseDate ? releaseDate.slice(0, 4) : "Unknown year";
}

// "2010-07-16" -> "16 July 2010" (parsed as UTC so the day never shifts)
export function formatDate(releaseDate) {
  if (!releaseDate) return "Unknown";
  return new Date(`${releaseDate}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// 142 -> "2h 22m"
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
