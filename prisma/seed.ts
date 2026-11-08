import {
  PrismaClient,
  UserRole,
  AcademicYear,
  UserStatus,
  EventStatus,
  AttendanceStatus,
  CreditCategory,
  TaskPriority,
  TaskStatus,
  ActivityCategory,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_MEMBERS,
  INITIAL_EVENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CREDITS,
  INITIAL_TASKS,
  INITIAL_ACTIVITIES,
} from '../src/data/mockData';

const prisma = new PrismaClient();

function mapUserRole(role: string): UserRole {
  switch (role) {
    case 'Admin':
      return UserRole.ADMIN;
    case 'Department Head':
      return UserRole.DEPARTMENT_HEAD;
    case 'Member':
    default:
      return UserRole.MEMBER;
  }
}

function mapAcademicYear(year: string): AcademicYear {
  switch (year) {
    case '1st Year':
    case 'Freshman':
      return AcademicYear.FIRST_YEAR;
    case '2nd Year':
    case 'Sophomore':
      return AcademicYear.SECOND_YEAR;
    case '3rd Year':
    case 'Junior':
      return AcademicYear.THIRD_YEAR;
    case '4th Year':
    case 'Senior':
      return AcademicYear.FOURTH_YEAR;
    default:
      return AcademicYear.FIRST_YEAR;
  }
}

function mapUserStatus(status: string): UserStatus {
  switch (status) {
    case 'Probation':
      return UserStatus.PROBATION;
    case 'Alumni':
      return UserStatus.ALUMNI;
    case 'Active':
    default:
      return UserStatus.ACTIVE;
  }
}

function mapEventStatus(status: string): EventStatus {
  switch (status) {
    case 'Ongoing':
      return EventStatus.ONGOING;
    case 'Completed':
      return EventStatus.COMPLETED;
    case 'Cancelled':
      return EventStatus.CANCELLED;
    case 'Upcoming':
    default:
      return EventStatus.UPCOMING;
  }
}

function mapAttendanceStatus(status: string): AttendanceStatus {
  switch (status) {
    case 'Absent':
      return AttendanceStatus.ABSENT;
    case 'Excused':
      return AttendanceStatus.EXCUSED;
    case 'Present':
    default:
      return AttendanceStatus.PRESENT;
  }
}

function mapCreditCategory(cat: string): CreditCategory {
  switch (cat) {
    case 'Task Completion':
      return CreditCategory.TASK_COMPLETION;
    case 'Leadership Bonus':
      return CreditCategory.LEADERSHIP_BONUS;
    case 'Penalty / Deduction':
      return CreditCategory.PENALTY_DEDUCTION;
    case 'Peer Recognition':
      return CreditCategory.PEER_RECOGNITION;
    case 'Event Attendance':
    default:
      return CreditCategory.EVENT_ATTENDANCE;
  }
}

function mapTaskPriority(pri: string): TaskPriority {
  switch (pri) {
    case 'High':
      return TaskPriority.HIGH;
    case 'Low':
      return TaskPriority.LOW;
    case 'Medium':
    default:
      return TaskPriority.MEDIUM;
  }
}

function mapTaskStatus(status: string): TaskStatus {
  switch (status) {
    case 'In Progress':
      return TaskStatus.IN_PROGRESS;
    case 'Under Review':
      return TaskStatus.UNDER_REVIEW;
    case 'Completed':
      return TaskStatus.COMPLETED;
    case 'To Do':
    default:
      return TaskStatus.TO_DO;
  }
}

function mapActivityCategory(cat: string): ActivityCategory {
  switch (cat) {
    case 'member':
      return ActivityCategory.MEMBER;
    case 'attendance':
      return ActivityCategory.ATTENDANCE;
    case 'credit':
      return ActivityCategory.CREDIT;
    case 'task':
      return ActivityCategory.TASK;
    case 'event':
    default:
      return ActivityCategory.EVENT;
  }
}

async function main() {
  console.log('🌱 Starting CampusPulse database seeding...');

  const defaultPasswordHash = await bcrypt.hash('campusPulse123!', 10);

  // 1. Clear existing records in reverse dependency order
  console.log('🧹 Cleaning existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.clubTask.deleteMany();
  await prisma.clubEvent.deleteMany();
  // Clear department head foreign keys first to allow deleting users
  await prisma.department.updateMany({ data: { headId: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 2. Seed Departments (without headId initially)
  console.log('🏛️  Seeding Departments...');
  for (const dept of INITIAL_DEPARTMENTS) {
    await prisma.department.create({
      data: {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
      },
    });
  }

  // 3. Seed Users
  console.log('👥 Seeding Users...');
  for (const m of INITIAL_MEMBERS) {
    await prisma.user.create({
      data: {
        id: m.id,
        name: m.name,
        email: m.email.toLowerCase(),
        passwordHash: defaultPasswordHash,
        studentId: m.studentId,
        academicYear: mapAcademicYear(m.academicYear),
        major: m.major,
        departmentId: m.departmentId,
        role: mapUserRole(m.role),
        attendancePercentage: m.attendancePercentage,
        totalCredits: m.totalCredits,
        joinedDate: m.joinedDate,
        status: mapUserStatus(m.status),
        bio: m.bio,
      },
    });
  }

  // 4. Update Departments with headId
  console.log('👑 Linking Department Heads...');
  for (const dept of INITIAL_DEPARTMENTS) {
    if (dept.headId) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { headId: dept.headId },
      });
    }
  }

  // 5. Seed Events
  console.log('📅 Seeding Events...');
  const deptNameToId = new Map(INITIAL_DEPARTMENTS.map((d) => [d.name, d.id]));
  for (const evt of INITIAL_EVENTS) {
    const targetDeptId =
      evt.department !== 'All Departments'
        ? deptNameToId.get(evt.department)
        : null;

    await prisma.clubEvent.create({
      data: {
        id: evt.id,
        title: evt.title,
        description: evt.description,
        date: evt.date,
        time: evt.time,
        location: evt.location,
        departmentId: targetDeptId,
        status: mapEventStatus(evt.status),
        capacity: evt.capacity,
        creditReward: evt.creditReward,
        mandatory: evt.mandatory,
      },
    });
  }

  // 6. Seed Attendance Records
  console.log('📋 Seeding Attendance Records...');
  for (const att of INITIAL_ATTENDANCE) {
    await prisma.attendanceRecord.create({
      data: {
        id: att.id,
        eventId: att.eventId,
        memberId: att.memberId,
        status: mapAttendanceStatus(att.status),
        markedAt: new Date(att.markedAt.replace(' ', 'T') + ':00Z'),
        markedBy: att.markedBy,
        note: att.note,
      },
    });
  }

  // 7. Seed Credit Transactions
  console.log('💳 Seeding Credit Transactions...');
  for (const crd of INITIAL_CREDITS) {
    await prisma.creditTransaction.create({
      data: {
        id: crd.id,
        memberId: crd.memberId,
        delta: crd.delta,
        reason: crd.reason,
        category: mapCreditCategory(crd.category),
        timestamp: new Date(crd.timestamp.replace(' ', 'T') + ':00Z'),
        issuedBy: crd.issuedBy,
      },
    });
  }

  // 8. Seed Tasks
  console.log('✅ Seeding Tasks...');
  for (const tsk of INITIAL_TASKS) {
    const deptId = deptNameToId.get(tsk.department) || INITIAL_DEPARTMENTS[0].id;
    await prisma.clubTask.create({
      data: {
        id: tsk.id,
        title: tsk.title,
        description: tsk.description,
        assignedToId: tsk.assignedToId,
        departmentId: deptId,
        deadline: tsk.deadline,
        status: mapTaskStatus(tsk.status),
        priority: mapTaskPriority(tsk.priority),
        creditValue: tsk.creditValue,
      },
    });
  }

  // 9. Seed Activity Logs
  console.log('📝 Seeding Activity Logs...');
  for (const act of INITIAL_ACTIVITIES) {
    await prisma.activityLog.create({
      data: {
        id: act.id,
        actorName: act.actorName,
        actorRole: act.actorRole,
        action: act.action,
        target: act.target,
        category: mapActivityCategory(act.category),
      },
    });
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

