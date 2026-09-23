-- FlowSched: add optional profile photo URL to users and faculty.
-- Null = no photo yet; the UI falls back to initials. The value is a URL
-- (local /uploads/avatars/<file> path in dev, or an S3/MinIO URL in prod).

ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "faculty" ADD COLUMN "avatar_url" TEXT;
