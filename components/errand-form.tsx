"use client";

import { useState, useEffect } from "react";
import { ErrandCategory } from "@/lib/types";
import { haversineDistance, estimatePrice, formatNGN } from "@/lib/geo";
import { ShoppingBag, PackageCheck, HeartHandshake, Clock3, MapPin, Loader2, ArrowRight, BriefcaseBusiness, Wrench } from "lucide-react";

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
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    detectLocation();
  }, []);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDetecting(false);
      },
      () => setDetecting(false),
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
          <label>
            <MapPin size={14} /> Pickup address
            <input required value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Where should the runner pick up?" />
          </label>
          {pickupCoords && <small className="coords-hint">Location detected: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}</small>}
          {detecting && <small className="coords-hint">Detecting location...</small>}
          <button type="button" className="text-btn" onClick={detectLocation}>Use my current location</button>

          <label>
            <MapPin size={14} /> Dropoff address (optional)
            <input value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} placeholder="Where should it be delivered?" />
          </label>

          {distance !== null && (
            <div className="distance-estimate">
              <span>Estimated distance: <strong>{distance} km</strong></span>
              <span>Estimated price: <strong>{formatNGN(price)}</strong></span>
            </div>
          )}

          <div className="form-step-actions">
            <button type="button" className="text-btn" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="button" onClick={() => setStep(3)} disabled={!pickupAddress}>
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
