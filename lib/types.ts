export type UserRole = "customer" | "runner" | "both";
export type ErrandCategory = "groceries" | "delivery" | "home_help" | "errand" | "temporary_job" | "service_request";
export type ErrandStatus = "posted" | "accepted" | "in_progress" | "completed" | "cancelled" | "disputed";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type TransactionType = "deposit" | "withdrawal" | "payment" | "earning" | "refund";
export type DisputeStatus = "open" | "investigating" | "resolved";
export type DisputeCategory = "service_issue" | "no_show" | "safety_concern" | "other";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_verified: boolean;
  phone_verified: boolean;
  address_verified: boolean;
  rating: number;
  rating_count: number;
  lat: number | null;
  lng: number | null;
  is_available: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Verification {
  id: number;
  user_id: string;
  id_type: string;
  id_number: string;
  id_image_url: string | null;
  status: VerificationStatus;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Errand {
  id: number;
  customer_id: string;
  title: string;
  description: string | null;
  category: ErrandCategory;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  status: ErrandStatus;
  price: number;
  distance_km: number | null;
  assigned_runner_id: string | null;
  completed_at: string | null;
  created_at: string;
  // joined fields
  customer?: Profile;
  assigned_runner?: Profile;
}

export interface Wallet {
  id: number;
  user_id: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  related_errand_id: number | null;
  created_at: string;
}

export interface Review {
  id: number;
  errand_id: number;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewee?: Profile;
  reviewer?: Profile;
}

export interface Dispute {
  id: number;
  errand_id: number;
  raised_by: string;
  reason: string;
  category: DisputeCategory;
  status: DisputeStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  errand?: Errand;
  raised_by_profile?: Profile;
}

export interface GpsRecord {
  id: number;
  user_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  related_errand_id: number | null;
  created_at: string;
}
