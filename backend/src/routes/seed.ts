import { db } from "../db";

export function seedDatabase() {
  // Clear existing data (optional - allows re-seeding)
  db.exec("DELETE FROM flights");
  db.exec("DELETE FROM students");
  db.exec("DELETE FROM instructors");
  db.exec("DELETE FROM planes");
  db.exec("DELETE FROM alerts");

  // Insert 5 instructors
  const instructors = ["Cole", "Diaz", "Patel", "Kim", "Nguyen"];
  const instructorStmt = db.prepare("INSERT INTO instructors (name) VALUES (?)");
  for (const name of instructors) {
    instructorStmt.run(name);
  }

  // Insert 5 planes
  const planes = ["N11111", "N22222", "N33333", "N44444", "N55555"];
  const planeStmt = db.prepare("INSERT INTO planes (tail_number) VALUES (?)");
  for (const tailNumber of planes) {
    planeStmt.run(tailNumber);
  }

  // Insert 20 students
  const studentNames = [
    "Jamie Lee",
    "Alex Rivera",
    "Morgan Chen",
    "Taylor Swift",
    "Jordan Martinez",
    "Casey Brown",
    "Riley Johnson",
    "Quinn Williams",
    "Sage Anderson",
    "Blake Davis",
    "Cameron Wilson",
    "Dakota Moore",
    "Emery Taylor",
    "Finley Jackson",
    "Harper White",
    "Indigo Harris",
    "Jules Clark",
    "Kai Lewis",
    "Lake Robinson",
    "Noah Walker",
  ];

  const levels = ["beginner", "intermediate", "advanced"];
  const preferredTimes = ["morning", "noon", "afternoon"];

  const studentStmt = db.prepare(
    "INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)"
  );

  const studentIds: number[] = [];
  for (const name of studentNames) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const preferredTime =
      preferredTimes[Math.floor(Math.random() * preferredTimes.length)];
    const result = studentStmt.run(name, level, preferredTime);
    studentIds.push(Number(result.lastInsertRowid));
  }

  // Insert ~40 flights (2 per student)
  const routes = [
    "KAUS–KGTU",
    "KAUS–KHYI",
    "KAUS–KEDC",
    "KAUS–KATT",
    "KAUS–KGTU",
  ];

  // Get instructor and plane IDs
  const instructorIds = db
    .query("SELECT id FROM instructors")
    .all() as { id: number }[];
  const planeIds = db.query("SELECT id FROM planes").all() as { id: number }[];

  const flightStmt = db.prepare(
    "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  // Generate flights for the current week (Monday to Friday, 8 AM - 5 PM)
  const now = new Date();
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 1 : 8 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(8, 0, 0, 0);

  let flightCount = 0;
  for (let day = 0; day < 5; day++) {
    // Monday to Friday
    for (let hour = 8; hour < 17; hour++) {
      // 8 AM to 4 PM (last flight ends at 5 PM)
      if (flightCount >= 40) break;

      const flightDate = new Date(monday);
      flightDate.setDate(monday.getDate() + day);
      flightDate.setHours(hour, 0, 0, 0);

      const endDate = new Date(flightDate);
      endDate.setHours(hour + 1, 0, 0, 0);

      // Assign to a random student (2 flights per student)
      const studentIndex = Math.floor(flightCount / 2) % studentIds.length;
      const studentId = studentIds[studentIndex];

      const instructorId =
        instructorIds[Math.floor(Math.random() * instructorIds.length)].id;
      const planeId = planeIds[Math.floor(Math.random() * planeIds.length)].id;
      const route = routes[Math.floor(Math.random() * routes.length)];

      flightStmt.run(
        studentId,
        instructorId,
        planeId,
        flightDate.toISOString(),
        endDate.toISOString(),
        route,
        "scheduled"
      );

      flightCount++;
    }
    if (flightCount >= 40) break;
  }

  // Insert alert
  const alertMessage = `Seeded 20 students, 5 instructors, 40 flights.`;
  db.run(
    "INSERT INTO alerts (timestamp, message) VALUES (datetime('now'), ?)",
    [alertMessage]
  );

  return {
    students: studentIds.length,
    instructors: instructors.length,
    planes: planes.length,
    flights: flightCount,
  };
}

