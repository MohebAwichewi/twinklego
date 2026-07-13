import { NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: Record<string, string>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  let endpoint: URL;
  if (query) {
    if (query.length < 3 || query.length > 180) {
      return NextResponse.json({ error: "Enter at least 3 characters." }, { status: 400 });
    }
    endpoint = new URL("/search", NOMINATIM_URL);
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("addressdetails", "1");
    endpoint.searchParams.set("limit", "5");
  } else if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    endpoint = new URL("/reverse", NOMINATIM_URL);
    endpoint.searchParams.set("lat", String(lat));
    endpoint.searchParams.set("lon", String(lng));
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("addressdetails", "1");
    endpoint.searchParams.set("zoom", "16");
  } else {
    return NextResponse.json({ error: "Provide an address query or valid coordinates." }, { status: 400 });
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "TwinkleGo/1.0 (hyperlocal errands marketplace)",
      },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Address search is temporarily unavailable." }, { status: 502 });
    }

    const raw = await response.json() as NominatimResult | NominatimResult[];
    const items = (Array.isArray(raw) ? raw : [raw])
      .filter(item => item?.display_name && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
      .map(item => ({
        id: String(item.place_id),
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type || "place",
      }));

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Address search is temporarily unavailable." }, { status: 502 });
  }
}
