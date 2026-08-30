export function displayOfferLocalTime(value) {
  const match = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):([0-5]\d)/.exec(value);
  if (!match) throw new Error("Offer time must include a local date and time.");
  const hour = Number(match[1]);
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}
