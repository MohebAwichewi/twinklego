"use client";

import { useState, useEffect } from "react";
import { ErrandCategory } from "@/lib/types";
import { haversineDistance, estimateTaskPrice, formatNGN, type TaskComplexity, type TaskUrgency } from "@/lib/geo";
import { ShoppingBag, PackageCheck, HeartHandshake, Clock3, Loader2, ArrowRight, BriefcaseBusiness, Wrench, ShieldCheck, Timer, Route } from "lucide-react";
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
  const [complexity, setComplexity] = useState<TaskComplexity>("standard");
  const [urgency, setUrgency] = useState<TaskUrgency>("standard");
  const [stopCount, setStopCount] = useState(0);
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
  const pricing = estimateTaskPrice({
    distanceKm: distance ?? 0,
    category,
    complexity,
    urgency,
    stopCount,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      title, description, category,
      pickup_address: pickupAddress, dropoff_address: dropoffAddress,
      pickup_lat: pickupCoords?.lat, pickup_lng: pickupCoords?.lng,
      dropoff_lat: dropoffCoords?.lat, dropoff_lng: dropoffCoords?.lng,
      complexity, urgency, stop_count: stopCount,
      price: pricing.customerTotal, distance_km: distance,
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

          <div className="task-factors">
            <fieldset className="factor-fieldset">
              <legend>How complex is the task?</legend>
              <div className="factor-options">
                {([
                  ["simple", "Simple", "Quick pickup or handoff"],
                  ["standard", "Standard", "Some waiting or handling"],
                  ["heavy", "Heavy", "Bulky, careful, or demanding"],
                ] as const).map(([value, label, description]) => (
                  <label key={value} className={complexity === value ? "active" : ""}>
                    <input type="radio" name="complexity" value={value} checked={complexity === value} onChange={() => setComplexity(value)} />
                    <span><strong>{label}</strong><small>{description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="factor-fieldset">
              <legend>When do you need it?</legend>
              <div className="factor-options compact">
                {([
                  ["flexible", "Flexible", "Best value"],
                  ["standard", "Today", "Normal priority"],
                  ["urgent", "Urgent", "Runner prioritizes it"],
                ] as const).map(([value, label, description]) => (
                  <label key={value} className={urgency === value ? "active" : ""}>
                    <input type="radio" name="urgency" value={value} checked={urgency === value} onChange={() => setUrgency(value)} />
                    <span><strong>{label}</strong><small>{description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="stops-control">Extra stops
              <span>
                <button type="button" onClick={() => setStopCount(count => Math.max(0, count - 1))} aria-label="Remove a stop">-</button>
                <strong>{stopCount}</strong>
                <button type="button" onClick={() => setStopCount(count => Math.min(5, count + 1))} aria-label="Add a stop">+</button>
              </span>
              <small>Pickup and final delivery are already included.</small>
            </label>
          </div>

          {pickupCoords && (
            <div className="fair-price-preview">
              <div><span><Route size={15} /> Route</span><strong>{distance !== null ? `${distance} km` : "Local task"}</strong></div>
              <div><span><Timer size={15} /> Estimated time</span><strong>About {pricing.estimatedMinutes} min</strong></div>
              <div className="fair-price-total"><span>Suggested fair price</span><strong>{formatNGN(pricing.customerTotal)}</strong><small>Typical range {formatNGN(pricing.fairRangeMin)} - {formatNGN(pricing.fairRangeMax)}</small></div>
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
          <h3>Review & Pay</h3>
          <p className="form-step-intro">Your task becomes visible to verified runners only after Paystack confirms payment.</p>
          <div className="review-card">
            <dl>
              <dt>Category</dt><dd>{category.replace("_", " ")}</dd>
              <dt>Title</dt><dd>{title}</dd>
              <dt>Description</dt><dd>{description || "None"}</dd>
              <dt>Pickup</dt><dd>{pickupAddress}</dd>
              <dt>Dropoff</dt><dd>{dropoffAddress || "Same as pickup"}</dd>
              <dt>Distance</dt><dd>{distance !== null ? `${distance} km` : "Local task"}</dd>
              <dt>Complexity</dt><dd className="capitalize">{complexity}</dd>
              <dt>Urgency</dt><dd className="capitalize">{urgency}</dd>
              <dt>Extra stops</dt><dd>{stopCount}</dd>
              <dt>Estimated time</dt><dd>About {pricing.estimatedMinutes} min</dd>
              <dt>You pay</dt><dd className="price-big">{formatNGN(pricing.customerTotal)}</dd>
              <dt>Runner earns</dt><dd>{formatNGN(pricing.runnerEarning)}</dd>
              <dt>TwinkleGo trust & support</dt><dd>{formatNGN(pricing.commissionAmount)}</dd>
            </dl>
          </div>

          <div className="secure-payment-note">
            <ShieldCheck size={20} />
            <span><strong>Protected transaction</strong><small>Payment is confirmed before matching. Payout starts only after you confirm delivery.</small></span>
          </div>

          <div className="form-step-actions">
            <button type="button" className="text-btn" onClick={() => setStep(2)}>Back</button>
            <button type="submit" className="button" disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> Opening secure payment...</> : <>Pay securely & publish <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
