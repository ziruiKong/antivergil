CREATE TABLE campus_people (
  subject text PRIMARY KEY,
  invite_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  latitude double precision,
  longitude double precision,
  location_expires_at timestamptz
);

CREATE TABLE campus_friendships (
  person_a text REFERENCES campus_people(subject),
  person_b text REFERENCES campus_people(subject),
  requested_by text NOT NULL REFERENCES campus_people(subject),
  accepted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (person_a, person_b),
  CHECK (person_a <> person_b)
);

CREATE TABLE campus_course_shares (
  sender text REFERENCES campus_people(subject),
  recipient text REFERENCES campus_people(subject),
  term text NOT NULL,
  sections jsonb NOT NULL,
  PRIMARY KEY (sender, recipient, term)
);
