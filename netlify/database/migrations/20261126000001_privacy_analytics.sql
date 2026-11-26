CREATE TABLE privacy_pageviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  page_path text NOT NULL,
  referrer_host text,
  session_hash text NOT NULL
);

CREATE INDEX privacy_pageviews_viewed_at_idx ON privacy_pageviews (viewed_at DESC);
CREATE INDEX privacy_pageviews_session_idx ON privacy_pageviews (session_hash, page_path, viewed_at DESC);

CREATE TABLE marketing_contacts (
  subject text PRIMARY KEY REFERENCES course_alert_recipients(subject) ON DELETE CASCADE,
  email text NOT NULL,
  marketing_active boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL,
  consented_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX marketing_contacts_active_idx ON marketing_contacts (marketing_active, updated_at DESC);
