"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

export interface AddressCoordinates {
  lat: number;
  lng: number;
}

interface AddressSuggestion extends AddressCoordinates {
  id: string;
  label: string;
  type: string;
}

interface AddressAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  coordinates: AddressCoordinates | null;
  required?: boolean;
  onChange: (value: string, coordinates: AddressCoordinates | null) => void;
}

export default function AddressAutocomplete({
  label,
  placeholder,
  value,
  coordinates,
  required = false,
  onChange,
}: AddressAutocompleteProps) {
  const id = useId();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (coordinates || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(value.trim())}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not search addresses.");
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setError(searchError instanceof Error ? searchError.message : "Could not search addresses.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [coordinates, value]);

  function selectAddress(suggestion: AddressSuggestion) {
    onChange(suggestion.label, { lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="address-field">
      <label htmlFor={id}><MapPin size={14} /> {label}</label>
      <div className={`address-input-wrap ${coordinates ? "address-confirmed" : ""}`}>
        <Search size={17} />
        <input
          id={id}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-results`}
          onChange={event => onChange(event.target.value, null)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {loading ? <Loader2 size={16} className="spin" /> : coordinates ? <span className="address-selected-dot" title="Location selected" /> : null}
      </div>

      {open && suggestions.length > 0 ? (
        <div className="address-results" id={`${id}-results`} role="listbox">
          {suggestions.map(suggestion => (
            <button key={suggestion.id} type="button" role="option" onClick={() => selectAddress(suggestion)}>
              <MapPin size={15} />
              <span>{suggestion.label}</span>
            </button>
          ))}
          <small>Address data © OpenStreetMap contributors</small>
        </div>
      ) : null}
      {error ? <small className="address-error">{error}</small> : null}
      {coordinates ? <AddressMap coordinates={coordinates} label={value} /> : null}
    </div>
  );
}

function AddressMap({ coordinates, label }: { coordinates: AddressCoordinates; label: string }) {
  const delta = 0.008;
  const bbox = [
    coordinates.lng - delta,
    coordinates.lat - delta,
    coordinates.lng + delta,
    coordinates.lat + delta,
  ].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${coordinates.lat}%2C${coordinates.lng}`;

  return (
    <div className="address-map">
      <iframe title={`Map showing ${label}`} src={src} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      <a href={`https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=16/${coordinates.lat}/${coordinates.lng}`} target="_blank" rel="noreferrer">
        Open larger map
      </a>
    </div>
  );
}
