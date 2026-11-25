CREATE TABLE course_comments (
  subject text NOT NULL REFERENCES campus_people(subject),
  course text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject, course)
);
CREATE INDEX course_comments_recent ON course_comments (course, updated_at DESC);
CREATE TABLE course_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL REFERENCES campus_people(subject),
  course text NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_files_recent ON course_files (course, created_at DESC);
