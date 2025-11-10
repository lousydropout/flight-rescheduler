// Mock API - returns sample data without requiring a backend server
// All functions use in-memory storage instead of HTTP requests

interface Flight {
  id: number;
  start_time: string;
  end_time: string;
  route: string;
  status: string;
  student_name: string;
  instructor_name: string;
  plane_tail_number: string;
}

interface WeatherEvent {
  id: number;
  start_time: string;
  end_time: string;
  affected_routes: string;
  condition: string;
}

interface Alert {
  id: number;
  timestamp: string;
  message: string;
}

interface RouteStatus {
  route: string;
  status: "clear" | "unsafe";
  weather_event: WeatherEvent | null;
}

interface TimeResponse {
  current_time: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  instructor_id: number;
  instructor_name: string;
  plane_id: number;
  plane_tail: string;
  available: boolean;
}

interface AvailableSlotsResponse {
  ok: boolean;
  slots?: TimeSlot[];
  error?: string;
}

interface RescheduleRequest {
  start_time: string;
  end_time: string;
  instructor_id: number;
  plane_id: number;
}

interface RescheduleResponse {
  ok: boolean;
  error?: string;
}

interface SimulateWeatherRequest {
  condition: string;
  duration_hours: number;
  start_time: string;
}

// Mock data storage (in-memory)
let mockFlights: Flight[] = [];
let mockWeather: WeatherEvent[] = [];
let mockAlerts: Alert[] = [];
let mockSimulationTime = new Date();
let alertCounter = 1;

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to calculate flight status based on current time
function calculateFlightStatus(flight: Flight, currentTime: Date): string {
  const start = new Date(flight.start_time);
  const end = new Date(flight.end_time);
  
  // If already cancelled, keep that status
  if (flight.status === 'cancelled') {
    return flight.status;
  }
  
  // If current time is past the end time, mark as completed
  if (currentTime >= end) {
    return 'completed';
  }
  
  // If current time is between start and end, mark as in_progress
  // (even if it was affected, once it starts it's in progress)
  if (currentTime >= start && currentTime < end) {
    return 'in_progress';
  }
  
  // If current time is before start, preserve 'affected' status if set,
  // otherwise mark as 'scheduled'
  if (currentTime < start) {
    // Check if flight should be affected by active weather
    const isAffectedByWeather = mockWeather.some(weather => {
      const weatherStart = new Date(weather.start_time);
      const weatherEnd = new Date(weather.end_time);
      const affectedRoutes = weather.affected_routes.split(',');
      
      // Check if flight overlaps with weather event and route matches
      const overlaps = (start >= weatherStart && start < weatherEnd) ||
                      (end > weatherStart && end <= weatherEnd) ||
                      (start <= weatherStart && end >= weatherEnd);
      
      return overlaps && affectedRoutes.includes(flight.route);
    });
    
    return isAffectedByWeather ? 'affected' : 'scheduled';
  }
  
  return flight.status;
}

// Helper to update all flight statuses based on current time
function updateFlightStatuses(currentTime: Date) {
  mockFlights.forEach(flight => {
    flight.status = calculateFlightStatus(flight, currentTime);
  });
}

// Helper to generate time slots
function generateTimeSlots(_flightId: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date(mockSimulationTime);
  now.setHours(now.getHours() + 1, 0, 0, 0); // Start from next hour
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 8; hour < 18; hour++) {
      const start = new Date(now);
      start.setDate(start.getDate() + day);
      start.setHours(hour, 0, 0, 0);
      
      const end = new Date(start);
      end.setHours(hour + 2, 0, 0, 0);
      
      slots.push({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        instructor_id: (day * 10 + hour) % 5 + 1,
        instructor_name: `Instructor ${(day * 10 + hour) % 5 + 1}`,
        plane_id: (day * 10 + hour) % 3 + 1,
        plane_tail: `N${100 + (day * 10 + hour) % 3}`,
        available: Math.random() > 0.3 // 70% available
      });
    }
  }
  
  return slots;
}

/**
 * Fetch all flights
 */
export async function getFlights(): Promise<Flight[]> {
  await delay(100);
  // Update flight statuses based on current simulation time
  updateFlightStatuses(mockSimulationTime);
  return [...mockFlights];
}

/**
 * Fetch active weather events
 */
export async function getWeather(): Promise<WeatherEvent[]> {
  await delay(100);
  // Filter out expired weather events
  const now = mockSimulationTime;
  return mockWeather.filter(w => new Date(w.end_time) > now);
}

/**
 * Fetch latest alerts
 */
export async function getAlerts(): Promise<Alert[]> {
  await delay(100);
  return [...mockAlerts].reverse().slice(0, 20); // Latest 20 alerts
}

/**
 * Fetch simulation time
 */
export async function getTime(): Promise<TimeResponse> {
  await delay(50);
  return { current_time: mockSimulationTime.toISOString() };
}

/**
 * Fetch route statuses
 */
export async function getRoutes(): Promise<RouteStatus[]> {
  await delay(100);
  const routes = ['A–B', 'B–C', 'C–D', 'D–A', 'A–C', 'B–D'];
  const now = mockSimulationTime;
  
  return routes.map(route => {
    const activeWeather = mockWeather.find(w => 
      new Date(w.start_time) <= now && 
      new Date(w.end_time) > now &&
      w.affected_routes.includes(route)
    );
    
    return {
      route,
      status: activeWeather ? "unsafe" : "clear",
      weather_event: activeWeather || null
    };
  });
}

/**
 * Seed database with initial data
 */
export async function seedData(): Promise<any> {
  await delay(300);
  
  // Generate sample flights
  mockFlights = [];
  const now = new Date(mockSimulationTime);
  
  for (let i = 1; i <= 30; i++) {
    const start = new Date(now);
    // Spread flights over the next 30 hours (one per hour)
    start.setHours(start.getHours() + i, 0, 0, 0);
    
    const end = new Date(start);
    end.setHours(end.getHours() + 2, 0, 0, 0);
    
    const routes = ['A–B', 'B–C', 'C–D', 'D–A', 'A–C', 'B–D'];
    
    const flight: Flight = {
      id: i,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      route: routes[i % routes.length],
      status: 'scheduled', // Will be calculated based on time
      student_name: `Student ${i}`,
      instructor_name: `Instructor ${(i % 5) + 1}`,
      plane_tail_number: `N${100 + (i % 3)}`
    };
    
    // Calculate initial status based on current time
    flight.status = calculateFlightStatus(flight, now);
    
    mockFlights.push(flight);
  }
  
  // Add alert
  mockAlerts.push({
    id: alertCounter++,
    timestamp: now.toISOString(),
    message: `Seeded ${mockFlights.length} flights`
  });
  
  return { ok: true, message: `Seeded ${mockFlights.length} flights` };
}

/**
 * Create a weather event
 */
export async function simulateWeather(data: SimulateWeatherRequest): Promise<any> {
  await delay(200);
  
  const startTime = new Date(data.start_time);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + data.duration_hours);
  
  const weatherEvent: WeatherEvent = {
    id: mockWeather.length + 1,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    affected_routes: 'A–B,B–C', // Sample affected routes
    condition: data.condition
  };
  
  mockWeather.push(weatherEvent);
  
  // Check for affected flights
  const affectedFlights = mockFlights.filter(f => {
    const flightStart = new Date(f.start_time);
    const flightEnd = new Date(f.end_time);
    return (flightStart >= startTime && flightStart < endTime) ||
           (flightEnd > startTime && flightEnd <= endTime) ||
           (flightStart <= startTime && flightEnd >= endTime);
  });
  
  affectedFlights.forEach(f => {
    if (f.status !== 'completed' && f.status !== 'cancelled') {
      f.status = 'affected';
    }
  });
  
  // Add alert
  mockAlerts.push({
    id: alertCounter++,
    timestamp: new Date().toISOString(),
    message: `Weather event created: ${data.condition} affecting ${affectedFlights.length} flights`
  });
  
  return { ok: true, weather_event: weatherEvent, affected_flights: affectedFlights.length };
}

/**
 * Fast forward simulation time
 */
export async function fastForwardTime(): Promise<TimeResponse> {
  await delay(150);
  mockSimulationTime = new Date(mockSimulationTime.getTime() + 60 * 60 * 1000); // Add 1 hour
  
  // Update flight statuses based on new time
  updateFlightStatuses(mockSimulationTime);
  
  return { current_time: mockSimulationTime.toISOString() };
}

/**
 * Reset simulation
 */
export async function cleanup(): Promise<any> {
  await delay(200);
  mockFlights = [];
  mockWeather = [];
  mockAlerts = [];
  mockSimulationTime = new Date();
  alertCounter = 1;
  
  return { ok: true, message: 'Simulation reset' };
}

/**
 * Check for flights affected by weather
 */
export async function safetyCheck(): Promise<any> {
  await delay(300);
  
  const now = mockSimulationTime;
  const activeWeather = mockWeather.filter(w => 
    new Date(w.start_time) <= now && new Date(w.end_time) > now
  );
  
  let affectedCount = 0;
  
  activeWeather.forEach(weather => {
    const startTime = new Date(weather.start_time);
    const endTime = new Date(weather.end_time);
    const affectedRoutes = weather.affected_routes.split(',');
    
    mockFlights.forEach(flight => {
      const flightStart = new Date(flight.start_time);
      const flightEnd = new Date(flight.end_time);
      const isInTimeRange = (flightStart >= startTime && flightStart < endTime) ||
                           (flightEnd > startTime && flightEnd <= endTime) ||
                           (flightStart <= startTime && flightEnd >= endTime);
      
      if (isInTimeRange && affectedRoutes.includes(flight.route)) {
        if (flight.status !== 'completed' && flight.status !== 'cancelled') {
          flight.status = 'affected';
          affectedCount++;
        }
      }
    });
  });
  
  // Add alert
  mockAlerts.push({
    id: alertCounter++,
    timestamp: now.toISOString(),
    message: `Safety check completed: ${affectedCount} flights affected by weather`
  });
  
  return { ok: true, affected_flights: affectedCount };
}

/**
 * Get available time slots for rescheduling a flight
 */
export async function getAvailableSlots(flightId: number): Promise<AvailableSlotsResponse> {
  await delay(200);
  
  const flight = mockFlights.find(f => f.id === flightId);
  if (!flight) {
    return { ok: false, error: 'Flight not found' };
  }
  
  const slots = generateTimeSlots(flightId);
  return { ok: true, slots };
}

/**
 * Reschedule a flight to a new time slot
 */
export async function rescheduleFlight(flightId: number, data: RescheduleRequest): Promise<RescheduleResponse> {
  await delay(250);
  
  const flight = mockFlights.find(f => f.id === flightId);
  if (!flight) {
    return { ok: false, error: 'Flight not found' };
  }
  
  // Update flight
  flight.start_time = data.start_time;
  flight.end_time = data.end_time;
  flight.status = 'scheduled';
  
  // Update instructor and plane (mock data)
  const instructorId = data.instructor_id;
  const planeId = data.plane_id;
  flight.instructor_name = `Instructor ${instructorId}`;
  flight.plane_tail_number = `N${100 + planeId}`;
  
  // Add alert
  mockAlerts.push({
    id: alertCounter++,
    timestamp: new Date().toISOString(),
    message: `Flight ${flightId} rescheduled to ${new Date(data.start_time).toLocaleString()}`
  });
  
  return { ok: true };
}

