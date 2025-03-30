/*
  # Initial Schema for Finance Management System

  1. New Tables
    - users (extends auth.users)
      - id (uuid, references auth.users)
      - role (enum: admin, staff, student)
      - full_name (text)
      - student_id (text, for students)
      - created_at (timestamp)
    
    - transactions
      - id (uuid)
      - user_id (uuid, references users)
      - type (enum: payment, fee, fine)
      - amount (decimal)
      - description (text)
      - status (enum: pending, approved, rejected)
      - created_at (timestamp)
    
    - accounts
      - id (uuid)
      - user_id (uuid, references users)
      - balance (decimal)
      - last_updated (timestamp)
      - created_at (timestamp)
    
    - activity_logs
      - id (uuid)
      - user_id (uuid, references users)
      - action (text)
      - details (jsonb)
      - created_at (timestamp)
    
    - settings
      - id (uuid)
      - key (text)
      - value (jsonb)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Create policies for each role
    - Set up audit triggers
*/

-- Create custom types if they don't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'staff', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('payment', 'fee', 'fine');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users,
  role user_role NOT NULL,
  full_name text NOT NULL,
  student_id text,
  department text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT student_id_required CHECK (
    (role = 'student' AND student_id IS NOT NULL) OR
    (role != 'student')
  )
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  type transaction_type NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  status transaction_status DEFAULT 'pending',
  approved_by uuid REFERENCES users,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL UNIQUE,
  balance decimal(10,2) DEFAULT 0.00,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_balance CHECK (balance >= 0)
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own data" ON users;
  DROP POLICY IF EXISTS "Admins can view all users" ON users;
  DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
  DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;
  DROP POLICY IF EXISTS "Admins and staff can view all transactions" ON transactions;
  DROP POLICY IF EXISTS "Admins and staff can approve transactions" ON transactions;
  DROP POLICY IF EXISTS "Users can view their own account" ON accounts;
  DROP POLICY IF EXISTS "Admins and staff can view all accounts" ON accounts;
  DROP POLICY IF EXISTS "Users can view their own logs" ON activity_logs;
  DROP POLICY IF EXISTS "Admins can view all logs" ON activity_logs;
  DROP POLICY IF EXISTS "Only admins can manage settings" ON settings;
END $$;

-- Create policies
-- Users policies
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and staff can view all transactions"
  ON transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admins and staff can approve transactions"
  ON transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- Accounts policies
CREATE POLICY "Users can view their own account"
  ON accounts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins and staff can view all accounts"
  ON accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- Activity logs policies
CREATE POLICY "Users can view their own logs"
  ON activity_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logs"
  ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Settings policies
CREATE POLICY "Only admins can manage settings"
  ON settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create or replace function to log activities
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, details)
  VALUES (
    COALESCE(NEW.user_id, auth.uid()),
    TG_TABLE_NAME || '_' || TG_OP,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'new_data', row_to_json(NEW),
      'old_data', row_to_json(OLD)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS log_transactions_trigger ON transactions;
DROP TRIGGER IF EXISTS log_accounts_trigger ON accounts;
DROP TRIGGER IF EXISTS update_balance_trigger ON transactions;

-- Create triggers for activity logging
CREATE TRIGGER log_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Create or replace function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    IF NEW.type = 'payment' THEN
      UPDATE accounts
      SET balance = balance + NEW.amount,
          last_updated = now()
      WHERE user_id = NEW.user_id;
    ELSIF NEW.type IN ('fee', 'fine') THEN
      UPDATE accounts
      SET balance = balance - NEW.amount,
          last_updated = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for balance updates
CREATE TRIGGER update_balance_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION update_account_balance();