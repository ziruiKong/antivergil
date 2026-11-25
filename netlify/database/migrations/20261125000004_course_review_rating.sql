ALTER TABLE course_comments ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5);
