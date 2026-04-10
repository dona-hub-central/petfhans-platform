export type UserRole = 'superadmin' | 'vet_admin' | 'veterinarian' | 'pet_owner'

export interface Clinic {
  id: string
  name: string
  slug: string
  owner_id: string
  subscription_plan: 'free' | 'basic' | 'pro'
  subscription_status: 'active' | 'inactive' | 'trial'
  max_patients: number
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

export interface Pet {
  id: string
  clinic_id: string
  owner_id: string
  name: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  breed: string | null
  birth_date: string | null
  weight: number | null
  gender: 'male' | 'female'
  neutered: boolean
  microchip: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
}

export interface MedicalRecord {
  id: string
  pet_id: string
  clinic_id: string
  vet_id: string
  visit_date: string
  reason: string
  diagnosis: string | null
  treatment: string | null
  medications: Medication[]
  notes: string | null
  next_visit: string | null
  created_at: string
}

export interface Medication {
  name: string
  dose: string
  frequency: string
  duration: string
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
