import { NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const PHOTON_URL = "https://photon.komoot.io";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: Record<string, string>;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
}

interface PhotonResponse {
  features?: PhotonFeature[];
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

  const nominatimItems = await fetchNominatim(endpoint);
  if (nominatimItems.length > 0) return NextResponse.json(nominatimItems);

  const photonEndpoint = new URL(query ? "/api/" : "/reverse", PHOTON_URL);
  if (query) {
    photonEndpoint.searchParams.set("q", query);
    photonEndpoint.searchParams.set("limit", "5");
  } else {
    photonEndpoint.searchParams.set("lat", String(lat));
    photonEndpoint.searchParams.set("lon", String(lng));
  }
  photonEndpoint.searchParams.set("lang", "en");

  const photonItems = await fetchPhoton(photonEndpoint);
  if (photonItems.length > 0) return NextResponse.json(photonItems);

  return NextResponse.json({ error: "Address search is temporarily unavailable." }, { status: 502 });
}

async function fetchNominatim(endpoint: URL) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "TwinkleGo/1.0 (hyperlocal errands marketplace)",
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(6_000),
    });

    if (!response.ok) return [];

    const raw = await response.json() as NominatimResult | NominatimResult[];
    return (Array.isArray(raw) ? raw : [raw])
      .filter(item => item?.display_name && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
      .map(item => ({
        id: String(item.place_id),
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type || "place",
      }));
  } catch {
    return [];
  }
}

async function fetchPhoton(endpoint: URL) {
  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "TwinkleGo/1.0 (hyperlocal errands marketplace)" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return [];

    const raw = await response.json() as PhotonResponse;
    return (raw.features ?? []).flatMap((feature, index) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties ?? {};
      if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return [];

      const labelParts = [
        properties.name,
        properties.housenumber,
        properties.street,
        properties.district,
        properties.city,
        properties.state,
        properties.postcode,
        properties.country,
      ].filter((part, partIndex, all) => part && all.indexOf(part) === partIndex);

      return [{
        id: `photon-${properties.osm_type ?? "place"}-${properties.osm_id ?? index}`,
        label: labelParts.join(", "),
        lat: coordinates[1],
        lng: coordinates[0],
        type: String(properties.type ?? properties.osm_value ?? "place"),
      }];
    }).filter(item => item.label);
  } catch {
    return [];
  }
}
