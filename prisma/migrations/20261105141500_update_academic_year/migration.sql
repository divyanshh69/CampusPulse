-- AlterTable: remove default
ALTER TABLE "users" ALTER COLUMN "academicYear" DROP DEFAULT;

-- Convert column to text temporarily
ALTER TABLE "users" ALTER COLUMN "academicYear" TYPE TEXT;

-- Drop old enum type
DROP TYPE "AcademicYear";

-- Create new enum type with proper academic years
CREATE TYPE "AcademicYear" AS ENUM ('1st Year', '2nd Year', '3rd Year', '4th Year');

-- Migrate existing rows to match new enum
UPDATE "users" SET "academicYear" = '1st Year' WHERE "academicYear" = 'FRESHMAN';
UPDATE "users" SET "academicYear" = '2nd Year' WHERE "academicYear" = 'SOPHOMORE';
UPDATE "users" SET "academicYear" = '3rd Year' WHERE "academicYear" = 'JUNIOR';
UPDATE "users" SET "academicYear" = '4th Year' WHERE "academicYear" = 'SENIOR';

-- Convert column back to new AcademicYear enum
ALTER TABLE "users" ALTER COLUMN "academicYear" TYPE "AcademicYear" USING ("academicYear"::"AcademicYear");

-- Restore default value
ALTER TABLE "users" ALTER COLUMN "academicYear" SET DEFAULT '1st Year'::"AcademicYear";

