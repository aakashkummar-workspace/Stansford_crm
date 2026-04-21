// Seed data — Stansford International / Vidyalaya360 (Indian school context)
// Used to initialize the JSON-backed datastore on first run.

export const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  n,
  label: `Class ${n}`,
  sections: ["A", "B"],
  students: [48, 52, 56, 54, 58, 62, 60, 55][n - 1],
}));

export const KPIS = {
  students: { value: 445, delta: "+12", deltaDir: "up", sub: "across Classes 1–8" },
  collected: { value: 8648000, delta: "+18.4%", deltaDir: "up", sub: "April collection" },
  pending: { value: 1284000, delta: "-6.2%", deltaDir: "down", sub: "82 students outstanding" },
  balance: { value: 4126500, delta: "+2.1%", deltaDir: "up", sub: "School + Trust combined" },
  income: { value: 9840000, delta: "+14%", deltaDir: "up" },
  expense: { value: 5713500, delta: "+3%", deltaDir: "up" },
  staff: { value: 38, delta: "+2", deltaDir: "up", sub: "32 teachers · 6 staff" },
  interns: { value: 7, delta: "", deltaDir: "", sub: "4 active rotations" },
  complaints: { value: 6, delta: "+2", deltaDir: "up", sub: "3 in progress" },
  enquiries: { value: 24, delta: "+9", deltaDir: "up", sub: "this week" },
  transport: { value: "92%", delta: "on time", deltaDir: "up", sub: "3 buses running" },
  donors: { value: 18, delta: "+1", deltaDir: "up", sub: "₹12.4L this year" },
};

const rand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const r = rand(42);

export const CLASS_STRENGTH = CLASSES.map((c) => ({
  cls: c.n,
  label: `Cl ${c.n}`,
  total: c.students,
  present: Math.round(c.students * (0.88 + r() * 0.1)),
  paid: Math.round(c.students * (0.78 + r() * 0.18)),
  pending: 0,
})).map((c) => ({ ...c, pending: c.total - c.paid }));

export const RECENT_FEES = [
  { id: "STN-2041", name: "Aanya Sharma", cls: "5-A", amount: 18500, method: "UPI", time: "2 min ago", status: "paid" },
  { id: "STN-1987", name: "Advait Patel", cls: "3-B", amount: 16800, method: "UPI", time: "9 min ago", status: "paid" },
  { id: "STN-2105", name: "Kiara Reddy", cls: "7-A", amount: 21200, method: "Cash", time: "22 min ago", status: "paid" },
  { id: "STN-1842", name: "Saanvi Desai", cls: "2-A", amount: 15400, method: "UPI", time: "38 min ago", status: "paid" },
  { id: "STN-2033", name: "Vivaan Iyer", cls: "6-B", amount: 19600, method: "Bank", time: "1 hr ago", status: "paid" },
  { id: "STN-1902", name: "Myra Joshi", cls: "4-A", amount: 17200, method: "UPI", time: "2 hr ago", status: "paid" },
];

export const PENDING_FEES = [
  { id: "STN-1811", name: "Reyansh Chauhan", cls: "8-A", amount: 22400, due: "3 days ago", overdue: true },
  { id: "STN-1733", name: "Shaurya Kapoor", cls: "7-B", amount: 21200, due: "5 days ago", overdue: true },
  { id: "STN-1950", name: "Pari Shetty", cls: "6-A", amount: 19600, due: "Tomorrow", overdue: false },
  { id: "STN-1622", name: "Navya Menon", cls: "5-B", amount: 18500, due: "in 4 days", overdue: false },
  { id: "STN-1889", name: "Atharv Trivedi", cls: "4-B", amount: 17200, due: "in 6 days", overdue: false },
];

export const ACTIVITIES = [
  { t: "fee", tone: "accent", title: "Fee received · STN-2041 Aanya Sharma", sub: "UPI · ₹18,500 · receipt auto-sent to +91 98xxxx4251", ts: "2m" },
  { t: "enquiry", tone: "info", title: "New admission enquiry · Class 3", sub: "Priya Nair · +91 99xxxx1823 · source: walk-in", ts: "8m" },
  { t: "complaint", tone: "bad", title: "Complaint opened · Transport route B", sub: "Parent of Krish Verma (4-A) · bus 12 min late", ts: "14m" },
  { t: "stock", tone: "bad", title: "Low stock alert · Class 5 notebooks", sub: "12 remaining · reorder threshold 20", ts: "31m" },
  { t: "attendance", tone: "default", title: "Attendance posted · Class 6-B", sub: "Ms. Deshmukh · 28/30 present", ts: "48m" },
  { t: "donation", tone: "ok", title: "Donation received · ₹1,00,000", sub: "Kothari Foundation · CSR · receipt 80G issued", ts: "1h" },
  { t: "salary", tone: "default", title: "Salary run scheduled · 38 staff", sub: "₹12,48,000 · posts Apr 30 · auto-approved", ts: "2h" },
  { t: "automation", tone: "accent", title: "Automation fired · Fee reminders", sub: "14 SMS + 14 WhatsApp sent · 2 failed", ts: "2h" },
];

export const ROUTES = [
  {
    code: "R1", name: "Whitefield — Marathahalli",
    driver: "Ramesh K.", bus: "KA-01-BZ-4271", status: "running", eta: "Arriving 3:42 PM",
    stops: [
      { t: "07:15", name: "Whitefield Main", cap: 12, boarded: 12, absent: 0, status: "done" },
      { t: "07:24", name: "ITPL Junction", cap: 8, boarded: 7, absent: 1, status: "done" },
      { t: "07:31", name: "Brookefield Gate 2", cap: 6, boarded: 5, absent: 1, status: "done" },
      { t: "07:40", name: "Marathahalli Bridge", cap: 9, boarded: 9, absent: 0, status: "done" },
      { t: "07:48", name: "Kundalahalli Colony", cap: 5, boarded: 2, absent: 0, status: "current" },
      { t: "07:56", name: "School Gate", cap: 0, boarded: 0, absent: 0, status: "pending" },
    ],
  },
  {
    code: "R2", name: "HSR Layout — Bellandur",
    driver: "Suresh P.", bus: "KA-01-BX-1183", status: "running", eta: "Arriving 3:55 PM",
    stops: [
      { t: "07:10", name: "HSR Sector 1", cap: 7, boarded: 7, absent: 0, status: "done" },
      { t: "07:18", name: "HSR Sector 6", cap: 9, boarded: 8, absent: 1, status: "done" },
      { t: "07:26", name: "Agara Lake", cap: 4, boarded: 3, absent: 1, status: "done" },
      { t: "07:34", name: "Bellandur Gate", cap: 8, boarded: 5, absent: 0, status: "current" },
      { t: "07:42", name: "School Gate", cap: 0, boarded: 0, absent: 0, status: "pending" },
    ],
  },
  {
    code: "R3", name: "Indiranagar — Koramangala",
    driver: "Mahesh D.", bus: "KA-01-CF-8892", status: "delayed", eta: "Late · 12 min",
    stops: [
      { t: "07:05", name: "Indiranagar 100ft", cap: 10, boarded: 10, absent: 0, status: "done" },
      { t: "07:15", name: "Domlur Bridge", cap: 5, boarded: 4, absent: 1, status: "done" },
      { t: "07:24", name: "Koramangala 5th", cap: 8, boarded: 4, absent: 0, status: "current" },
      { t: "07:34", name: "Koramangala 1st", cap: 6, boarded: 0, absent: 0, status: "pending" },
      { t: "07:44", name: "School Gate", cap: 0, boarded: 0, absent: 0, status: "pending" },
    ],
  },
];

export const COMPLAINTS = [
  { id: "CMP-0312", student: "Krish Verma", cls: "4-A", parent: "Nandini Verma", issue: "Transport route B arriving late 3rd day this week", date: "Today, 9:12", status: "Open", assigned: "Transport Desk" },
  { id: "CMP-0311", student: "Diya Singh", cls: "6-A", parent: "Rahul Singh", issue: "Homework tracker not updated since Monday", date: "Today, 8:03", status: "In Progress", assigned: "Ms. Rao" },
  { id: "CMP-0310", student: "Atharv Trivedi", cls: "4-B", parent: "Meera Trivedi", issue: "Lunchbox went missing after PE class", date: "Yesterday", status: "In Progress", assigned: "Admin Desk" },
  { id: "CMP-0309", student: "Aadhya Rao", cls: "7-A", parent: "Sanjay Rao", issue: "Request clarification on term fee breakup", date: "Yesterday", status: "Resolved", assigned: "Accounts" },
  { id: "CMP-0308", student: "Kabir Bose", cls: "2-B", parent: "Ananya Bose", issue: "Textbook Vol. 2 not issued yet for Class 2", date: "2 days ago", status: "Open", assigned: "Inventory" },
  { id: "CMP-0307", student: "Zara Pillai", cls: "3-A", parent: "Ravi Pillai", issue: "Handwriting notebook marking unclear", date: "3 days ago", status: "Resolved", assigned: "Ms. Iyer" },
];

export const ENQUIRIES = [
  { id: "ENQ-1124", name: "Priya Nair", parent: "Ajay Nair", phone: "+91 99842 17823", cls: 3, source: "Walk-in", date: "Today", status: "New" },
  { id: "ENQ-1123", name: "Rohan Gupta", parent: "Neha Gupta", phone: "+91 98108 33412", cls: 1, source: "Website", date: "Today", status: "Contacted" },
  { id: "ENQ-1122", name: "Ishita Menon", parent: "Karthik Menon", phone: "+91 90196 61204", cls: 5, source: "Referral", date: "Yesterday", status: "Contacted" },
  { id: "ENQ-1121", name: "Aryan Reddy", parent: "Divya Reddy", phone: "+91 94482 91103", cls: 6, source: "Instagram", date: "Yesterday", status: "Converted" },
  { id: "ENQ-1120", name: "Meher Chauhan", parent: "Vikram Chauhan", phone: "+91 97037 12094", cls: 2, source: "Walk-in", date: "2 days ago", status: "New" },
  { id: "ENQ-1119", name: "Dev Kapoor", parent: "Sonia Kapoor", phone: "+91 98887 40213", cls: 4, source: "Website", date: "3 days ago", status: "Rejected" },
  { id: "ENQ-1118", name: "Kyra Banerjee", parent: "Anirban Banerjee", phone: "+91 98304 67881", cls: 7, source: "Referral", date: "4 days ago", status: "Converted" },
  { id: "ENQ-1117", name: "Arnav Iyer", parent: "Lakshmi Iyer", phone: "+91 98456 77890", cls: 1, source: "Walk-in", date: "5 days ago", status: "Contacted" },
];

export const INVENTORY = [
  { cls: "All", item: "Chemistry Lab Kit", category: "Asset", stock: 4, min: 6, issued: 0, status: "low" },
  { cls: "Class 5", item: "Science Notebook", category: "Book", stock: 12, min: 20, issued: 46, status: "low" },
  { cls: "Class 3", item: "Uniform (Summer M)", category: "Uniform", stock: 8, min: 15, issued: 40, status: "low" },
  { cls: "Class 7", item: "Math Textbook Vol.2", category: "Book", stock: 24, min: 15, issued: 38, status: "ok" },
  { cls: "Class 1", item: "Reading Primer", category: "Book", stock: 31, min: 20, issued: 44, status: "ok" },
  { cls: "Class 8", item: "Physics Practical", category: "Book", stock: 22, min: 15, issued: 34, status: "ok" },
  { cls: "All", item: "Tablet · iPad 10", category: "Asset", stock: 6, min: 4, issued: 18, status: "ok" },
  { cls: "Class 2", item: "Craft Supplies Pack", category: "Asset", stock: 3, min: 10, issued: 40, status: "low" },
  { cls: "Class 6", item: "Uniform (PE Kit)", category: "Uniform", stock: 18, min: 12, issued: 44, status: "ok" },
];

export const STAFF = [
  { name: "Rashmi Iyer", role: "Principal", dept: "Admin", attendance: 98, tasks: 92, score: 94, status: "top", avatar: "RI" },
  { name: "Anita Deshmukh", role: "Teacher · Class 6", dept: "Academics", attendance: 96, tasks: 88, score: 91, status: "top", avatar: "AD" },
  { name: "Vikram Rao", role: "Teacher · Class 8", dept: "Academics", attendance: 94, tasks: 82, score: 87, status: "ok", avatar: "VR" },
  { name: "Neha Kulkarni", role: "Teacher · Class 3", dept: "Academics", attendance: 92, tasks: 84, score: 86, status: "ok", avatar: "NK" },
  { name: "Sanjay Mehta", role: "Academic Director", dept: "Admin", attendance: 97, tasks: 90, score: 92, status: "top", avatar: "SM" },
  { name: "Priya Shah", role: "Teacher · Class 5", dept: "Academics", attendance: 89, tasks: 72, score: 78, status: "ok", avatar: "PS" },
  { name: "Arun Joshi", role: "Teacher · Class 2", dept: "Academics", attendance: 76, tasks: 60, score: 66, status: "low", avatar: "AJ" },
  { name: "Ramesh K.", role: "Driver · R1", dept: "Transport", attendance: 99, tasks: 96, score: 96, status: "top", avatar: "RK" },
  { name: "Sunita Pillai", role: "Accountant", dept: "Finance", attendance: 95, tasks: 89, score: 90, status: "ok", avatar: "SP" },
  { name: "Kavya N.", role: "Intern · Class 4", dept: "Academics", attendance: 84, tasks: 70, score: 74, status: "ok", avatar: "KN" },
];

export const DONORS = [
  { id: "DNR-021", name: "Kothari Foundation", type: "CSR", ytd: 1500000, last: "Apr 18", next: "Aug 10" },
  { id: "DNR-019", name: "Infosys Foundation", type: "CSR", ytd: 2200000, last: "Mar 30", next: "Sep 15" },
  { id: "DNR-017", name: "Ramesh Iyengar", type: "Individual", ytd: 85000, last: "Apr 12", next: "—" },
  { id: "DNR-014", name: "Bansal Family Trust", type: "Trust", ytd: 400000, last: "Apr 02", next: "Jul 20" },
  { id: "DNR-012", name: "Wipro Cares", type: "CSR", ytd: 3100000, last: "Feb 22", next: "Jun 01" },
  { id: "DNR-010", name: "Shreya Sen", type: "Alumni", ytd: 60000, last: "Apr 14", next: "—" },
];

export const INCOME_SERIES = [
  { w: "W1", inc: 18.2, exp: 12.1 },
  { w: "W2", inc: 22.0, exp: 11.4 },
  { w: "W3", inc: 19.5, exp: 12.8 },
  { w: "W4", inc: 24.1, exp: 13.2 },
  { w: "W5", inc: 28.5, exp: 14.1 },
  { w: "W6", inc: 21.0, exp: 12.2 },
  { w: "W7", inc: 26.8, exp: 13.9 },
  { w: "W8", inc: 32.4, exp: 15.1 },
  { w: "W9", inc: 30.1, exp: 14.6 },
  { w: "W10", inc: 27.7, exp: 13.0 },
  { w: "W11", inc: 35.6, exp: 16.4 },
  { w: "W12", inc: 41.2, exp: 17.8 },
];

export const AUTOMATIONS = [
  { name: "Fee paid → Receipt + WhatsApp", runs: 318, last: "2 min ago", status: "live" },
  { name: "Fee due in 3 days → Reminder SMS", runs: 84, last: "1 hr ago", status: "live" },
  { name: "Overdue > 7 days → Alert parent + admin", runs: 11, last: "Today", status: "live" },
  { name: "Low stock < threshold → Inventory alert", runs: 6, last: "31 min ago", status: "live" },
  { name: "Staff inactivity > 3 days → Flag", runs: 2, last: "Yesterday", status: "live" },
  { name: "Monthly report → Board + Director", runs: 1, last: "Apr 01", status: "live" },
  { name: "New enquiry → Auto-call queue", runs: 24, last: "8 min ago", status: "live" },
  { name: "Donation received → 80G receipt + thank-you", runs: 9, last: "1 hr ago", status: "live" },
];

export const SCHOOLS = [
  { id: "ssv", name: "Sri Saraswati Vidyalaya", city: "Chennai", students: 842, fees: 91, wellness: 94, status: "Healthy", puck: "" },
  { id: "sps", name: "Saraswati Public School", city: "Coimbatore", students: 624, fees: 78, wellness: 88, status: "Healthy", puck: "v2" },
  { id: "sat", name: "Saraswati Academy (Trichy)", city: "Trichy", students: 412, fees: 86, wellness: 91, status: "Healthy", puck: "v3" },
];

export const TRUST_KPIS = {
  students: { value: "1,878", delta: "+3.4%", sub: "vs last term" },
  collected: { value: "86%", delta: "+2.1%", sub: "₹2.14 Cr of ₹2.48 Cr" },
  donations: { value: "₹18,42,000", delta: "+12.6%", sub: "from 28 donors" },
  teacherNPS: { value: "62", delta: "+4", sub: "parent pulse" },
};

export const ANOMALIES = [
  { tone: "warn", t: "Coimbatore: fee collection −24% vs same week LY", s: "Review Class 6 & 7 defaulters" },
  { tone: "bad", t: "Trichy Van Route 4 running 41% longer today", s: "Driver contacted · parents notified" },
  { tone: "info", t: "Chennai: 82 attendance dips on 15 Apr", s: "Assembly holiday — no action" },
];

export const DONATION_PIPELINE = [
  { stage: "Lead", count: 14, amount: 3400000 },
  { stage: "In talks", count: 9, amount: 5200000 },
  { stage: "Committed", count: 6, amount: 2800000 },
  { stage: "Received", count: 28, amount: 1842000 },
];

export const COMPLIANCE = [
  { t: "Board reports submitted", v: 12, goal: 12, tone: "ok" },
  { t: "Fire safety audits", v: 3, goal: 3, tone: "ok" },
  { t: "Teacher verification", v: 96, goal: 100, tone: "warn" },
  { t: "POSH training", v: 82, goal: 100, tone: "warn" },
];

export const AI_BRIEF = [
  "Coimbatore fee collection is tracking −24%. 11 high-risk families identified; suggest personal calls from Principal this week.",
  "Trichy Van Route 4 has run late 3 days this week. GPS shows a recurring jam at Srirangam Bridge 07:15–07:40.",
  "Teacher NPS improved +4 points after the April wellbeing sprint. Consider replicating the Class 6-B homeroom model across schools.",
];

export const ROLES = [
  { k: "super", label: "Super Admin", icon: "shield" },
  { k: "principal", label: "Principal", icon: "school" },
  { k: "teacher", label: "Teacher", icon: "book" },
  { k: "parent", label: "Parent", icon: "heart" },
];

export const USERS = [
  { id: "USR-001", name: "Rajesh Iyer", email: "rajesh@saraswatitrust.org", role: "Super Admin", school: "All schools", status: "Active", lastSeen: "Now" },
  { id: "USR-002", name: "Rashmi Iyer", email: "rashmi@stansford.edu", role: "Principal", school: "Sri Saraswati Vidyalaya", status: "Active", lastSeen: "12 min ago" },
  { id: "USR-003", name: "Sanjay Mehta", email: "sanjay@stansford.edu", role: "Academic Director", school: "Sri Saraswati Vidyalaya", status: "Active", lastSeen: "2 hr ago" },
  { id: "USR-004", name: "Anita Deshmukh", email: "anita@stansford.edu", role: "Teacher", school: "Sri Saraswati Vidyalaya", status: "Active", lastSeen: "5 hr ago" },
  { id: "USR-005", name: "Sunita Pillai", email: "sunita@stansford.edu", role: "Accountant", school: "Sri Saraswati Vidyalaya", status: "Active", lastSeen: "Yesterday" },
  { id: "USR-006", name: "Kumar Devarajan", email: "kumar@spscoimbatore.edu", role: "Principal", school: "Saraswati Public School", status: "Active", lastSeen: "1 hr ago" },
  { id: "USR-007", name: "Nalini Subramanian", email: "nalini@satrichy.edu", role: "Principal", school: "Saraswati Academy (Trichy)", status: "Invited", lastSeen: "—" },
];

export const AUDIT = [
  { id: "AUD-09812", who: "Rashmi Iyer", action: "Marked fee paid", entity: "STN-2041 Aanya Sharma", when: "08:42", ip: "10.0.1.45" },
  { id: "AUD-09811", who: "Sanjay Mehta", action: "Approved reorder", entity: "Class 5 notebooks · 60 units", when: "08:31", ip: "10.0.1.22" },
  { id: "AUD-09810", who: "System", action: "Automation fired", entity: "Fee reminders · 14 SMS / 14 WA", when: "08:00", ip: "—" },
  { id: "AUD-09809", who: "Anita Deshmukh", action: "Posted attendance", entity: "Class 6-B · 28/30 present", when: "07:48", ip: "10.0.1.71" },
  { id: "AUD-09808", who: "Sunita Pillai", action: "Issued 80G receipt", entity: "DNR-021 Kothari Foundation · ₹1,00,000", when: "07:22", ip: "10.0.1.18" },
  { id: "AUD-09807", who: "Rajesh Iyer", action: "Updated user role", entity: "USR-007 Nalini → Principal", when: "Yesterday 18:14", ip: "203.0.113.47" },
];

export const DEFAULTS = {
  theme: "light",
  role: "principal",
  view: "desktop",
  density: "compact",
  sidebar: "expanded",
  accent: "indigo",
};
