-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEPARTMENT_HEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "AcademicYear" AS ENUM ('FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PROBATION', 'ALUMNI');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "CreditCategory" AS ENUM ('EVENT_ATTENDANCE', 'TASK_COMPLETION', 'LEADERSHIP_BONUS', 'PENALTY_DEDUCTION', 'PEER_RECOGNITION');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('MEMBER', 'EVENT', 'ATTENDANCE', 'CREDIT', 'TASK');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "headId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "studentId" TEXT NOT NULL,
    "academicYear" "AcademicYear" NOT NULL DEFAULT 'FRESHMAN',
    "major" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "attendancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "totalCredits" INTEGER NOT NULL DEFAULT 50,
    "joinedDate" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "departmentId" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "capacity" INTEGER NOT NULL DEFAULT 60,
    "creditReward" INTEGER NOT NULL DEFAULT 20,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "category" "CreditCategory" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" TEXT NOT NULL,
    "issuerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TO_DO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "creditValue" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_headId_key" ON "departments"("headId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "club_events_status_idx" ON "club_events"("status");

-- CreateIndex
CREATE INDEX "club_events_date_idx" ON "club_events"("date");

-- CreateIndex
CREATE INDEX "club_events_departmentId_idx" ON "club_events"("departmentId");

-- CreateIndex
CREATE INDEX "attendance_records_eventId_idx" ON "attendance_records"("eventId");

-- CreateIndex
CREATE INDEX "attendance_records_memberId_idx" ON "attendance_records"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_eventId_memberId_key" ON "attendance_records"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "credit_transactions_memberId_idx" ON "credit_transactions"("memberId");

-- CreateIndex
CREATE INDEX "credit_transactions_timestamp_idx" ON "credit_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "club_tasks_assignedToId_idx" ON "club_tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "club_tasks_departmentId_idx" ON "club_tasks"("departmentId");

-- CreateIndex
CREATE INDEX "club_tasks_status_idx" ON "club_tasks"("status");

-- CreateIndex
CREATE INDEX "activity_logs_category_idx" ON "activity_logs"("category");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headId_fkey" FOREIGN KEY ("headId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_events" ADD CONSTRAINT "club_events_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_tasks" ADD CONSTRAINT "club_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_tasks" ADD CONSTRAINT "club_tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
