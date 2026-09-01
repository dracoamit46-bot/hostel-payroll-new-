-- =========================================================================
-- MIGRATION: Payroll Module (Fixed Monthly Salary, Snapshots & Adjustments)
-- =========================================================================

-- 1. Ensure monthly_salary and metadata exists on users table
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 16000,
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create salary_history table (preserves historical compensation rates)
CREATE TABLE IF NOT EXISTS public.salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  monthly_salary NUMERIC NOT NULL CHECK (monthly_salary > 0),
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL indicates active current salary
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_hist_user ON public.salary_history (user_id, effective_from);

-- 3. Create salary_advances table (advance tracking & recovery)
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  recovered_amount NUMERIC DEFAULT 0 CHECK (recovered_amount >= 0),
  outstanding_amount NUMERIC NOT NULL CHECK (outstanding_amount >= 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fully_recovered', 'cancelled')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_adv_user ON public.salary_advances (user_id, status);

-- 4. Create payroll_records table (comprehensive monthly snapshot)
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  payroll_month TEXT NOT NULL, -- Format: YYYY-MM
  
  -- Salary & Dynamic Divisor Snapshots
  monthly_salary NUMERIC NOT NULL CHECK (monthly_salary > 0),
  calendar_days INTEGER NOT NULL CHECK (calendar_days BETWEEN 28 AND 31),
  daily_rate NUMERIC NOT NULL CHECK (daily_rate > 0),
  
  -- Attendance Metric Snapshots
  present_days NUMERIC DEFAULT 0,
  half_days NUMERIC DEFAULT 0,
  week_offs NUMERIC DEFAULT 0,
  carry_forward_week_offs NUMERIC DEFAULT 0,
  paid_leaves NUMERIC DEFAULT 0,
  absent_days NUMERIC DEFAULT 0,
  lop_leaves NUMERIC DEFAULT 0,
  excess_week_offs NUMERIC DEFAULT 0,
  
  -- Day Totals
  payable_days NUMERIC NOT NULL,
  total_lop_days NUMERIC NOT NULL,
  
  -- Financial Breakdowns
  lop_deduction NUMERIC DEFAULT 0,
  late_penalty_deduction NUMERIC DEFAULT 0,
  advance_recovery NUMERIC DEFAULT 0,
  other_additions NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  gross_salary NUMERIC NOT NULL,
  net_salary NUMERIC NOT NULL CHECK (net_salary >= 0),
  excess_unrecovered_deduction NUMERIC DEFAULT 0,
  
  -- Lifecycle Status
  status TEXT DEFAULT 'calculated' CHECK (status IN ('draft', 'calculated', 'approved', 'locked', 'paid')),
  
  -- Payment Record Details
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
  payment_date DATE,
  payment_mode TEXT CHECK (payment_mode IS NULL OR payment_mode IN ('upi', 'cash', 'bank_transfer', 'cheque')),
  transaction_ref TEXT,
  payment_notes TEXT,
  paid_amount NUMERIC DEFAULT 0,
  
  -- Audit Trail
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  locked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  paid_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  
  CONSTRAINT uq_payroll_user_month UNIQUE (user_id, payroll_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_prop_month ON public.payroll_records (property_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_user ON public.payroll_records (user_id);

-- 5. Create payroll_adjustments table (line-item additions/deductions)
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('addition', 'deduction')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_adj_rec ON public.payroll_adjustments (payroll_record_id);
