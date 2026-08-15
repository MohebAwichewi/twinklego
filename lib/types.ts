export type UserRole = "customer" | "runner" | "both";
export type ErrandCategory = "groceries" | "delivery" | "home_help" | "errand" | "temporary_job" | "service_request";
export type ErrandStatus =
  | "awaiting_payment"
  | "payment_failed"
  | "posted"
  | "accepted"
  | "in_progress"
  | "awaiting_confirmation"
  | "payout_pending"
  | "completed"
  | "cancelled"
  | "disputed";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type TransactionType = "deposit" | "withdrawal" | "payment" | "earning" | "refund";
export type PaymentStatus = "initializing" | "pending" | "paid" | "failed" | "refunded";
export type PayoutStatus = "pending" | "processing" | "otp_required" | "success" | "failed" | "reversed";
export type DisputeStatus = "open" | "investigating" | "resolved";
export type DisputeCategory = "service_issue" | "no_show" | "safety_concern" | "other";
export type TaskTrackingPhase =
  | "accepted"
  | "heading_to_pickup"
  | "picked_up"
  | "en_route_delivery"
  | "delivered";

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
  is_super_admin: boolean;
  is_suspended: boolean;
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
  estimated_minutes: number | null;
  complexity: "simple" | "standard" | "heavy";
  urgency: "flexible" | "standard" | "urgent";
  stop_count: number;
  commission_amount: number;
  runner_earning: number;
  assigned_runner_id: string | null;
  completed_at: string | null;
  created_at: string;
  // joined fields
  customer?: Profile;
  assigned_runner?: Profile;
  tracking?: TaskTracking;
  payment?: Pick<ErrandPayment, "status" | "amount" | "currency" | "paid_at">;
  payout?: Pick<RunnerPayout, "status" | "amount" | "paid_at">;
}

export interface ErrandPayment {
  id: number;
  errand_id: number;
  customer_id: string;
  provider: "paystack";
  provider_reference: string;
  authorization_url: string | null;
  access_code: string | null;
  amount: number;
  currency: "NGN";
  status: PaymentStatus;
  commission_amount: number;
  runner_payout_amount: number;
  paid_at: string | null;
  refund_status: "pending" | "processing" | "needs_attention" | "processed" | "failed" | null;
  refund_reference: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunnerPayoutAccount {
  id: number;
  user_id: string;
  provider: "paystack";
  recipient_code: string;
  account_name: string;
  bank_name: string;
  account_last4: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunnerPayout {
  id: number;
  errand_id: number;
  runner_id: string;
  provider: "paystack";
  provider_reference: string;
  provider_transfer_code: string | null;
  amount: number;
  currency: "NGN";
  status: PayoutStatus;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskMessage {
  id: number;
  errand_id: number;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

export interface AdminAuditLog {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Pick<Profile, "id" | "full_name">;
}

export interface TaskTracking {
  id: number;
  errand_id: number;
  phase: TaskTrackingPhase;
  runner_lat: number | null;
  runner_lng: number | null;
  distance_to_next_km: number | null;
  eta_minutes: number | null;
  accepted_at: string | null;
  heading_to_pickup_at: string | null;
  picked_up_at: string | null;
  en_route_delivery_at: string | null;
  delivered_at: string | null;
  last_location_at: string | null;
  updated_at: string;
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
