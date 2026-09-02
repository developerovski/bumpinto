export type Coords = { lat: number; lng: number; label: string | null };

// MVP tavizi (belgeli): Nominatim istemciden; trafik artarsa backend proxy.
export async function geocode(query: string): Promise<Coords | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const rows: { lat: string; lon: string; display_name: string }[] = await res.json();
  if (!rows.length) return null;
  return {
    lat: Number(rows[0].lat),
    lng: Number(rows[0].lon),
    label: rows[0].display_name.split(",")[0],
  };
}

// MVP tavizi (belgeli): Nominatim istemciden; trafik artarsa backend proxy.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } },
    );
    const row: { address?: { city?: string; town?: string; village?: string; municipality?: string } } =
      await res.json();
    return row.address?.city ?? row.address?.town ?? row.address?.village ?? row.address?.municipality ?? null;
  } catch {
    return null;
  }
}
