ALTER TABLE campus_messages ADD COLUMN read_at timestamptz;
UPDATE campus_messages SET read_at = created_at WHERE read_at IS NULL;

CREATE INDEX campus_messages_unread_recipient
  ON campus_messages (recipient, sender, id)
  WHERE read_at IS NULL;

INSERT INTO campus_people (subject, invite_code, display_name)
VALUES ('official:antivergil', 'ANTIVERGIL01', 'ANTIVERGIL Official')
ON CONFLICT (subject) DO UPDATE SET display_name = excluded.display_name;
