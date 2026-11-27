CREATE TABLE campus_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender text NOT NULL REFERENCES campus_people(subject),
  recipient text NOT NULL REFERENCES campus_people(subject),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campus_messages_sender_id ON campus_messages (sender, id DESC);
CREATE INDEX campus_messages_recipient_id ON campus_messages (recipient, id DESC);
