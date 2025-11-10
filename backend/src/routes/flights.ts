import { db } from "../db";

export function getAllFlights() {
  // Get all flights with joined student, instructor, and plane info
  const flights = db.query(`
    SELECT 
      f.id,
      f.start_time,
      f.end_time,
      f.route,
      f.status,
      s.name as student_name,
      s.level as student_level,
      s.preferred_time as student_preferred_time,
      i.name as instructor_name,
      p.tail_number as plane_tail_number
    FROM flights f
    LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN instructors i ON f.instructor_id = i.id
    LEFT JOIN planes p ON f.plane_id = p.id
    ORDER BY f.start_time ASC
  `).all();
  
  return flights;
}

