import { store } from "../store";

export function seedDatabase() {
  // Clear existing data
  store.clearAll();

  // Insert 5 instructors
  const instructors = ["Cole", "Diaz", "Patel", "Kim", "Nguyen"];
  for (const name of instructors) {
    store.addInstructor(name);
  }

  // Insert 5 planes
  const planes = ["N11111", "N22222", "N33333", "N44444", "N55555"];
  for (const tailNumber of planes) {
    store.addPlane(tailNumber);
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

  const studentIds: number[] = [];
  for (const name of studentNames) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const preferredTime =
      preferredTimes[Math.floor(Math.random() * preferredTimes.length)];
    const id = store.addStudent(name, level, preferredTime);
    studentIds.push(id);
  }

  // Insert ~40 flights (2 per student)
  const routes = [
    "KAUS–KGTU",
    "KAUS–KHYI",
    "KAUS–KEDC",
    "KAUS–KATT",
    "KAUS–KGTU",
  ];

  const instructorIds = store.getInstructors();
  const planeIds = store.getPlanes();

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

      store.addFlight(
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
  store.addAlert(new Date().toISOString(), alertMessage);

  return {
    students: studentIds.length,
    instructors: instructors.length,
    planes: planes.length,
    flights: flightCount,
  };
}

