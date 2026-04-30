export type UserRole = 'superadmin' | 'vet_admin' | 'veterinarian' | 'pet_owner'

export interface Clinic {
  id: string
  name: string
  slug: string
  owner_id: string
  subscription_plan: 'free' | 'basic' | 'pro'
  subscription_status: 'active' | 'inactive' | 'trial'
  max_patients: number
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  verified: boolean
  created_at: string
}

export interface Profile {
  id: string
  user_id: string
  clinic_id: string | null
  role: UserRole
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'

export interface Pet {
  id: string
  clinic_id: string
  owner_id: string
  name: string
  species: PetSpecies
  breed: string | null
  birth_date: string | null
  weight: number | null
  gender: 'male' | 'female'
  neutered: boolean
  microchip: string | null
  photo_url: string | null
  notes: string | null
  is_active?: boolean
  created_at: string
}

export interface Medication {
  name: string
  dose: string
  route?: string
  frequency: string
  duration: string
}

export interface Vaccine {
  name: string
  lot: string
  next_date: string
}

export interface PhysicalExam {
  weight: string
  temperature: string
  heart_rate: string
  respiratory_rate: string
  general_state: string
  mucous: string
  hydration: string
  lymph_nodes: string
  cardiovascular: string
  respiratory: string
  digestive: string
  musculoskeletal: string
  skin: string
  other: string
}

export interface MedicalRecord {
  id: string
  pet_id: string
  clinic_id: string
  vet_id: string
  visit_date: string
  visit_type?: string
  reason: string
  diagnosis: string | null
  prognosis?: string | null
  treatment: string | null
  medications: Medication[]
  vaccines?: Vaccine[]
  physical_exam?: PhysicalExam | null
  notes: string | null
  next_visit: string | null
  created_at: string
}

export interface PetFile {
  id: string
  pet_id: string
  clinic_id?: string
  file_name: string
  file_type: string
  file_size: number
  mime_type: string
  file_path?: string
  notes: string | null
  category: string
  created_at: string
}

export interface PetFileWithUrl extends Omit<PetFile, 'file_path'> {
  file_path: string
  publicUrl: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Appointment {
  id: string
  clinic_id: string
  pet_id: string
  owner_id: string
  vet_id: string | null
  appointment_date: string
  appointment_time: string
  reason: string
  status: AppointmentStatus
  duration: number
  notes: string | null
  cancellation_reason: string | null
  is_virtual: boolean
  created_at: string
}

export interface Invitation {
  id: string
  clinic_id: string
  email: string
  role: UserRole
  token: string
  expires_at: string
  used_at: string | null
  created_by: string
  created_at: string
}

export interface HabitLog {
  id: string
  pet_id: string
  date: string
  category: 'diet' | 'exercise' | 'medication' | 'behavior'
  value: string
  notes: string | null
  created_at: string
}

// ── Marketplace ───────────────────────────────────────────────────────────

export type CareRequestStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'
export type ClinicJoinRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface ClinicPublicProfile {
  description?: string
  city?: string
  address?: string
  phone?: string
  cover_url?: string
  specialties?: string[]
  species?: PetSpecies[]
  hours?: string
  allows_virtual?: boolean
  allows_presential?: boolean
}

export interface MarketplaceClinic {
  id: string
  name: string
  slug: string
  verified: boolean
  public_profile: ClinicPublicProfile | null
}

export interface MarketplaceVet {
  id: string
  full_name: string
  avatar_url: string | null
  clinic_id: string | null
  clinics: { id: string; name: string; slug: string } | null
}

export interface CareRequest {
  id: string
  requester_id: string
  clinic_id: string
  pet_name: string | null
  pet_species: string | null
  reason: string | null
  preferred_vet_id: string | null
  status: CareRequestStatus
  rejection_note: string | null
  created_at: string
  responded_at: string | null
  retry_after: string | null
}

export interface ClinicBlock {
  id: string
  clinic_id: string
  owner_id: string
  created_at: string
}

export interface ClinicJoinRequest {
  id: string
  vet_id: string
  clinic_id: string
  message: string | null
  status: ClinicJoinRequestStatus
  created_at: string
  responded_at: string | null
}

// ── Query result shapes (Supabase join returns) ────────────────────────────

/** Pet summary for search dropdowns */
export type PetSummary = Pick<Pet, 'id' | 'name' | 'species' | 'breed' | 'weight'>

/** Pet with owner profile, used in vet pet lists */
export interface PetWithOwner extends Pet {
  profiles: { full_name: string; email: string; phone?: string | null } | null
}

/** Medical record with pet and vet info, used in vet lists */
export interface RecordListItem {
  id: string
  pet_id: string
  clinic_id: string
  vet_id: string
  visit_date: string
  visit_type: string
  reason: string
  diagnosis: string | null
  next_visit: string | null
  created_at: string
  pets: { id: string; name: string; species: string } | null
  profiles: { full_name: string } | null
}

/** Medical record with vet info, used in owner history view */
export interface RecordWithVet {
  id: string
  visit_date: string
  visit_type: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  next_visit: string | null
  profiles: { full_name: string } | null
}

/** Appointment with limited fields for owner view */
export type AppointmentSummary = Pick<
  Appointment,
  'id' | 'appointment_date' | 'appointment_time' | 'reason' |
  'status' | 'is_virtual' | 'notes' | 'cancellation_reason'
>

/** Appointment with pet and owner relations, used in vet calendar */
export interface AppointmentWithRelations extends Appointment {
  pets: { name: string; species: string } | null
  profiles: { full_name: string; email: string } | null
}

/** Invitation with optional pet reference */
export interface InvitationWithPet extends Invitation {
  pets?: { name: string } | null
}

/** Clinic with owner admin profile, used in admin panel */
export interface ClinicWithAdmin extends Clinic {
  profiles: { full_name: string; email: string } | null
}

/** Pet with next scheduled visit, used in owner dashboard */
export interface PetWithNextVisit extends Pet {
  nextVisit: string | null
}
