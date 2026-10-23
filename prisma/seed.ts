/**
 * Seed script — Online Attendance Management System
 * Sankar Matriculation School
 *
 * Creates:
 *  - Admin + 2 teacher accounts
 *  - Classes 1-10 (Section A)
 *  - Subjects
 *  - 5 demo students per class (50 total)
 *  - ~24 weekdays of attendance history (up to yesterday, so today is free to mark)
 *
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const FIRST_NAMES = [
  "Aarav", "Adhira", "Ananya", "Arjun", "Deepa", "Dinesh", "Gokul", "Harini",
  "Ishwarya", "Karthik", "Kavin", "Keerthana", "Krishna", "Lakshmi", "Madhavan",
  "Meena", "Murali", "Nandhini", "Naveen", "Poongodi", "Praveen", "Priya",
  "Ragul", "Ramya", "Sanjay", "Sathya", "Shalini", "Sneha", "Surya", "Swetha",
  "Tamilselvan", "Vasanth", "Vignesh", "Yogeshwari", "Bhuvaneshwari",
  "Chandru", "Divya", "Elango", "Gayathri", "Janani",
];
const LAST_NAMES = [
  "Kumar", "Selvi", "Rajan", "Devi", "Murugan", "Lakshmi", "Sundaram", "Krishnan",
  "Balaji", "Nachiyar", "Palanisamy", "Chinnasamy", "Mani", "Rani", "Ganesan",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding...");

  // Clear existing data (order matters for relations)
  await db.attendance.deleteMany();
  await db.student.deleteMany();
  await db.subject.deleteMany();
  await db.classSection.deleteMany();
  await db.user.deleteMany();

  // ---- Users ----
  await db.user.createMany({
    data: [
      {
        username: "admin",
        passwordHash: hashPassword("admin123"),
        name: "School Administrator",
        role: "ADMIN",
      },
      {
        username: "teacher1",
        passwordHash: hashPassword("teacher123"),
        name: "Meena Sundaram",
        role: "TEACHER",
      },
      {
        username: "teacher2",
        passwordHash: hashPassword("teacher123"),
        name: "Ramesh Kumar",
        role: "TEACHER",
      },
    ],
  });

  // ---- Classes 1-10, Section A ----
  const classes: { id: string; label: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    const c = await db.classSection.create({
      data: { name: String(i), section: "A" },
    });
    classes.push({ id: c.id, label: `${c.name}-${c.section}` });
  }

  // ---- Subjects ----
  const subjects = [
    { name: "Tamil", code: "TAM" },
    { name: "English", code: "ENG" },
    { name: "Mathematics", code: "MAT" },
    { name: "Science", code: "SCI" },
    { name: "Social Science", code: "SST" },
  ];
  await db.subject.createMany({ data: subjects });

  // ---- Students: 5 per class ----
  const students: { id: string; classIdx: number }[] = [];
  let admNo = 1;
  const usedNames = new Set<string>();
  for (let ci = 0; ci < classes.length; ci++) {
    for (let s = 0; s < 5; s++) {
      let name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      let guard = 0;
      while (usedNames.has(name) && guard++ < 50) {
        name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      }
      usedNames.add(name);
      const genders = ["MALE", "FEMALE"];
      const student = await db.student.create({
        data: {
          admissionNo: `SMS${String(admNo++).padStart(4, "0")}`,
          name,
          gender: pick(genders),
          guardianName: `${pick(LAST_NAMES)} ${pick(FIRST_NAMES)}`,
          contact: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
          classSectionId: classes[ci].id,
          // student portal login: admission number (lowercase) + shared demo password
          username: `sms${String(admNo - 1).padStart(4, "0")}`,
          passwordHash: hashPassword("student123"),
        },
      });
      students.push({ id: student.id, classIdx: ci });
    }
  }

  // ---- Attendance history: last 24 weekdays, up to yesterday ----
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (dates.length < 24) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) dates.push(localDateStr(cursor)); // skip Sat/Sun
    cursor.setDate(cursor.getDate() - 1);
  }
  dates.reverse();

  const teachers = await db.user.findMany({ where: { role: "TEACHER" } });
  let records: {
    studentId: string;
    date: string;
    status: string;
    markedById: string;
  }[] = [];

  for (const date of dates) {
    for (const st of students) {
      const roll = Math.random();
      const status = roll < 0.9 ? "PRESENT" : roll < 0.955 ? "ABSENT" : "LEAVE";
      records.push({
        studentId: st.id,
        date,
        status,
        markedById: pick(teachers).id,
      });
    }
  }
  // insert in chunks to keep memory flat
  for (let i = 0; i < records.length; i += 500) {
    await db.attendance.createMany({ data: records.slice(i, i + 500) });
  }
  records = [];

  const counts = await Promise.all([
    db.user.count(),
    db.classSection.count(),
    db.student.count(),
    db.attendance.count(),
  ]);

  console.log(
    `Done. Users: ${counts[0]}, Classes: ${counts[1]}, Students: ${counts[2]}, Attendance records: ${counts[3]}`
  );
  console.log("Logins -> admin/admin123 | teacher1/teacher123 | teacher2/teacher123");
  console.log("Students -> admission no (e.g. SMS0001, case-insensitive) / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
