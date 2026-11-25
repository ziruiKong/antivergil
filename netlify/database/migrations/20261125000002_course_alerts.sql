CREATE TABLE course_alert_recipients (
  subject text PRIMARY KEY,
  email text NOT NULL
);

CREATE TABLE course_alert_watches (
  subject text NOT NULL REFERENCES course_alert_recipients(subject),
  term text NOT NULL,
  call_number text NOT NULL,
  enrolled integer,
  capacity integer,
  snapshot_at timestamptz,
  PRIMARY KEY (subject, term, call_number)
);

CREATE TABLE course_alert_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject text NOT NULL,
  term text NOT NULL,
  call_number text NOT NULL,
  subject_line text NOT NULL,
  body text NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  FOREIGN KEY (subject, term, call_number) REFERENCES course_alert_watches ON DELETE CASCADE
);
