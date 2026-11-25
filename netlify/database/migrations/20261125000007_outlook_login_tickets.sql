CREATE TABLE outlook_login_tickets (
  token_hash text PRIMARY KEY,
  stage text NOT NULL CHECK (stage IN ('state', 'login')),
  email text,
  oauth_subject text,
  display_name text,
  picture text,
  return_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outlook_login_tickets_expiry_idx
  ON outlook_login_tickets (expires_at);
