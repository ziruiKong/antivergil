CREATE TABLE course_schedules (
  google_subject text NOT NULL,
  term text NOT NULL,
  sections jsonb NOT NULL CHECK (jsonb_typeof(sections) = 'array'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  PRIMARY KEY (google_subject, term)
);

CREATE TABLE course_schedule_sessions (
  token_hash text PRIMARY KEY,
  google_subject text NOT NULL,
  expires_at timestamptz NOT NULL
);
