CREATE TABLE email_verification_grants (
  google_subject text PRIMARY KEY,
  email text NOT NULL,
  verified_until timestamptz NOT NULL
);
