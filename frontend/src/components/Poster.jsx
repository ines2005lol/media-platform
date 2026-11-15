// Shows the poster image when the title has one; otherwise a coloured
// placeholder with the title (the seed catalogue has no images).
function hue(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// "The Dark Knight" -> "DK", "Alien" -> "A"
function initials(title) {
  const words = title.replace(/^(the|a|an)\s+/i, "").split(/[\s:\-]+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function Poster({ title, posterUrl, size = "card" }) {
  if (posterUrl) {
    return <img className={`poster poster-${size}`} src={posterUrl} alt={`${title} poster`} />;
  }
  const h = hue(title);
  return (
    <div
      className={`poster poster-${size} poster-placeholder`}
      style={{ background: `linear-gradient(150deg, hsl(${h} 45% 32%), hsl(${(h + 40) % 360} 50% 16%))` }}
      role="img"
      aria-label={`${title} (no poster available)`}
    >
      <span aria-hidden="true">{initials(title)}</span>
    </div>
  );
}
