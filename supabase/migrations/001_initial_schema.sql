-- =============================================
-- PETFHANS - Schema inicial MVP
-- =============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CLINICS (multi-tenant core)
-- =============================================
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  subscription_plan TEXT DEFAULT 'trial' CHECK (subscription_plan IN ('trial', 'basic', 'pro')),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  max_patients INTEGER DEFAULT 50,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROFILES (usuarios del sistema)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'vet_admin', 'veterinarian', 'pet_owner')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PETS (mascotas)
-- =============================================
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'other')),
  breed TEXT,
  birth_date DATE,
  weight DECIMAL(5,2),
  gender TEXT CHECK (gender IN ('male', 'female')),
  neutered BOOLEAN DEFAULT FALSE,
  microchip TEXT,
  photo_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEDICAL RECORDS (historial médico)
-- =============================================
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  vet_id UUID NOT NULL REFERENCES profiles(id),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  medications JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  next_visit DATE,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVITATIONS (sistema de invitaciones)
-- =============================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('vet_admin', 'veterinarian', 'pet_owner')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  pet_id UUID REFERENCES pets(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HABIT LOGS (seguimiento de hábitos)
-- =============================================
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('diet', 'exercise', 'medication', 'behavior', 'weight')),
  value TEXT NOT NULL,
  numeric_value DECIMAL(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Función helper: obtener clinic_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Función helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- CLINICS policies
CREATE POLICY "Superadmin ve todas las clínicas" ON clinics
  FOR ALL USING (get_user_role() = 'superadmin');

CREATE POLICY "Usuarios ven su propia clínica" ON clinics
  FOR SELECT USING (id = get_user_clinic_id());

-- PROFILES policies
CREATE POLICY "Superadmin ve todos los perfiles" ON profiles
  FOR ALL USING (get_user_role() = 'superadmin');

CREATE POLICY "Usuarios ven perfiles de su clínica" ON profiles
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Usuarios editan su propio perfil" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- PETS policies
CREATE POLICY "Vets ven mascotas de su clínica" ON pets
  FOR SELECT USING (
    clinic_id = get_user_clinic_id() AND
    get_user_role() IN ('vet_admin', 'veterinarian')
  );

CREATE POLICY "Dueños ven sus mascotas" ON pets
  FOR SELECT USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Vets gestionan mascotas de su clínica" ON pets
  FOR ALL USING (
    clinic_id = get_user_clinic_id() AND
    get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- MEDICAL RECORDS policies
CREATE POLICY "Vets gestionan historiales de su clínica" ON medical_records
  FOR ALL USING (
    clinic_id = get_user_clinic_id() AND
    get_user_role() IN ('vet_admin', 'veterinarian')
  );

CREATE POLICY "Dueños ven historiales de sus mascotas" ON medical_records
  FOR SELECT USING (
    pet_id IN (
      SELECT id FROM pets WHERE owner_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- INVITATIONS policies
CREATE POLICY "Vets admin gestionan invitaciones" ON invitations
  FOR ALL USING (
    clinic_id = get_user_clinic_id() AND
    get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- HABIT LOGS policies
CREATE POLICY "Dueños gestionan hábitos de sus mascotas" ON habit_logs
  FOR ALL USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Vets ven hábitos de mascotas de su clínica" ON habit_logs
  FOR SELECT USING (
    pet_id IN (SELECT id FROM pets WHERE clinic_id = get_user_clinic_id()) AND
    get_user_role() IN ('vet_admin', 'veterinarian')
  );

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_clinic_id ON profiles(clinic_id);
CREATE INDEX idx_pets_clinic_id ON pets(clinic_id);
CREATE INDEX idx_pets_owner_id ON pets(owner_id);
CREATE INDEX idx_medical_records_pet_id ON medical_records(pet_id);
CREATE INDEX idx_medical_records_clinic_id ON medical_records(clinic_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_habit_logs_pet_id ON habit_logs(pet_id);
