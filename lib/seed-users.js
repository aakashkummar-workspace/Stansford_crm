// Demo accounts seeded on first run. Same plain passwords are shown on the
// login page hint card so testers can sign in. Hashed before storage.

import { listUsers, createUser, getUserByEmail } from "./db.js";
import { hashPassword } from "./auth.js";

export const DEMO_ACCOUNTS = [
  { id: "USR-ADMIN", email: "admin@school.com", password: "admin123", role: "admin", name: "Super Admin" },
  { id: "USR-DIRECTOR", email: "director@school.com", password: "director123", role: "academic_director", name: "Academic Director" },
  { id: "USR-PRINCIPAL", email: "principal@school.com", password: "principal123", role: "principal", name: "Rashmi Iyer" },
  // Teacher is linked to a specific class via linkedId — Academic + Students
  // screens scope to this class for the logged-in teacher. The format is
  // "CLASS_NUMBER-SECTION" (e.g. "2-A").
  { id: "USR-TEACHER", email: "teacher@school.com", password: "teacher123", role: "teacher", name: "Anita Kumar", linkedId: "2-A" },
  // Parent's linkedId is the student id (set via auto-link to the first
  // student if missing — see app/api/auth/login/route.js fallback).
  { id: "USR-PARENT", email: "parent@school.com", password: "parent123", role: "parent", name: "Parent Demo" },
];

export async function ensureDemoUsers() {
  const existing = await listUsers();
  const have = new Set(existing.map((u) => u.email));
  const created = [];
  for (const a of DEMO_ACCOUNTS) {
    if (have.has(a.email)) continue;
    const dup = await getUserByEmail(a.email);
    if (dup) continue;
    const passwordHash = await hashPassword(a.password);
    const row = await createUser({
      id: a.id, email: a.email, passwordHash,
      role: a.role, name: a.name, linkedId: a.linkedId || null,
    });
    created.push({ email: row.email, role: row.role });
  }
  return created;
}
