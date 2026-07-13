"use client";

import { useState, useEffect } from "react";
import { ErrandCategory } from "@/lib/types";
import { haversineDistance, estimatePrice, formatNGN } from "@/lib/geo";
import { ShoppingBag, PackageCheck, HeartHandshake, Clock3, MapPin, Loader2, ArrowRight, BriefcaseBusiness, Wrench } from "lucide-react";
import AddressAutocomplete, { AddressCoordinates } from "./address-autocomplete";

const categories: { value: ErrandCategory; label: string; icon: typeof ShoppingBag; color: string }[] = [
  { value: "groceries", label: "Groceries", icon: ShoppingBag, color: "coral" },
  { value: "delivery", label: "Delivery", icon: PackageCheck, color: "blue" },
  { value: "home_help", label: "Home Help", icon: HeartHandshake, color: "teal" },
  { value: "temporary_job", label: "Temporary Job", icon: BriefcaseBusiness, color: "blue" },
  { value: "service_request", label: "Service Request", icon: Wrench, color: "teal" },
  { value: "errand", label: "Quick Errand", icon: Clock3, color: "gold" },
];

interface ErrandFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
}

export default function ErrandForm({ onSubmit, loading }: ErrandFormProps) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ErrandCategory>("errand");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<AddressCoordinates | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<AddressCoordinates | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    const suggestedTitle = new URLSearchParams(window.location.search).get("title");
    if (suggestedTitle) setTitle(suggestedTitle);
  }, []);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setDetecting(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickupCoords(coords);
        try {
          const response = await fetch(`/api/locations/search?lat=${coords.lat}&lng=${coords.lng}`);
          const data = await response.json();
          if (response.ok && data[0]?.label) setPickupAddress(data[0].label);
        } catch {
          setLocationError("We found your coordinates but could not load the street address.");
        }
        setDetecting(false);
      },
      () => {
        setLocationError("Location access was not available. Search for the pickup address instead.");
        setDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  }

  const distance = pickupCoords && dropoffCoords
    ? Math.round(haversineDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng) * 100) / 100
    : null;
  const price = distance ? estimatePrice(distance) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      title, description, category,
      pickup_address: pickupAddress, dropoff_address: dropoffAddress,
      pickup_lat: pickupCoords?.lat, pickup_lng: pickupCoords?.lng,
      dropoff_lat: dropoffCoords?.lat, dropoff_lng: dropoffCoords?.lng,
      price, distance_km: distance,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="errand-form">
      {step === 1 && (
        <div className="form-step">
          <h3>What do you need help with?</h3>
          <div className="category-grid">
            {categories.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                className={`category-card ${category === value ? "active" : ""} ${color}`}
                onClick={() => setCategory(value)}
              >
                <Icon size={24} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <label>Title
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Pick up groceries from Shoprite" />
          </label>
          <label>Description (optional)
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details about what you need..." rows={3} />
          </label>
          <button type="button" className="button" onClick={() => setStep(2)} disabled={!title}>
            Next: Location <ArrowRight size={16} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="form-step">
          <h3>Where?</h3>
          <AddressAutocomplete
            label="Pickup address"
            placeholder="Search for the pickup address"
            value={pickupAddress}
            coordinates={pickupCoords}
            required
            onChange={(address, coords) => { setPickupAddress(address); setPickupCoords(coords); }}
          />
          {pickupCoords && <small className="coords-hint">Confirmed map coordinates: {pickupCoords.lat.toFixed(5)}, {pickupCoords.lng.toFixed(5)}</small>}
          {detecting && <small className="coords-hint">Detecting location...</small>}
          {locationError && <small className="address-error">{locationError}</small>}
          <button type="button" className="text-btn" onClick={detectLocation} disabled={detecting}>Use my current location</button>

          <AddressAutocomplete
            label="Dropoff address (optional)"
            placeholder="Search for the delivery address"
            value={dropoffAddress}
            coordinates={dropoffCoords}
            onChange={(address, coords) => { setDropoffAddress(address); setDropoffCoords(coords); }}
          />

          {distance !== null && (
            <div className="distance-estimate">
              <span>Estimated distance: <strong>{distance} km</strong></span>
              <span>Estimated price: <strong>{formatNGN(price)}</strong></span>
            </div>
          )}

          <div className="form-step-actions">
            <button type="button" className="text-btn" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="button" onClick={() => setStep(3)} disabled={!pickupAddress || !pickupCoords || (Boolean(dropoffAddress) && !dropoffCoords)}>
              Next: Review <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-step">
          <h3>Review & Post</h3>
          <div className="review-card">
            <dl>
              <dt>Category</dt><dd>{category.replace("_", " ")}</dd>
              <dt>Title</dt><dd>{title}</dd>
              <dt>Description</dt><dd>{description || "None"}</dd>
              <dt>Pickup</dt><dd>{pickupAddress}</dd>
              <dt>Dropoff</dt><dd>{dropoffAddress || "Same as pickup"}</dd>
              <dt>Distance</dt><dd>{distance ? `${distance} km` : "Not calculated"}</dd>
              <dt>Price</dt><dd className="price-big">{formatNGN(price)}</dd>
            </dl>
          </div>

          <div className="form-step-actions">
            <button type="button" className="text-btn" onClick={() => setStep(2)}>Back</button>
            <button type="submit" className="button" disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> Posting...</> : <>Post Errand</>}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
