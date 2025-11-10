// In-memory data store to replace SQLite

interface Student {
  id: number;
  name: string;
  level: string;
  preferred_time: string;
}

interface Instructor {
  id: number;
  name: string;
}

interface Plane {
  id: number;
  tail_number: string;
}

interface Flight {
  id: number;
  student_id: number;
  instructor_id: number;
  plane_id: number;
  start_time: string;
  end_time: string;
  route: string;
  status: string;
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

class InMemoryStore {
  private students: Student[] = [];
  private instructors: Instructor[] = [];
  private planes: Plane[] = [];
  private flights: Flight[] = [];
  private weatherEvents: WeatherEvent[] = [];
  private alerts: Alert[] = [];
  private simulationTime: string = new Date().toISOString();
  private nextId: { [key: string]: number } = {
    students: 1,
    instructors: 1,
    planes: 1,
    flights: 1,
    weatherEvents: 1,
    alerts: 1,
  };

  // Students
  addStudent(name: string, level: string, preferred_time: string): number {
    const id = this.nextId.students++;
    this.students.push({ id, name, level, preferred_time });
    return id;
  }

  getStudents(): Student[] {
    return [...this.students];
  }

  getStudent(id: number): Student | undefined {
    return this.students.find(s => s.id === id);
  }

  // Instructors
  addInstructor(name: string): number {
    const id = this.nextId.instructors++;
    this.instructors.push({ id, name });
    return id;
  }

  getInstructors(): Instructor[] {
    return [...this.instructors];
  }

  getInstructor(id: number): Instructor | undefined {
    return this.instructors.find(i => i.id === id);
  }

  // Planes
  addPlane(tail_number: string): number {
    const id = this.nextId.planes++;
    this.planes.push({ id, tail_number });
    return id;
  }

  getPlanes(): Plane[] {
    return [...this.planes];
  }

  getPlane(id: number): Plane | undefined {
    return this.planes.find(p => p.id === id);
  }

  // Flights
  addFlight(
    student_id: number,
    instructor_id: number,
    plane_id: number,
    start_time: string,
    end_time: string,
    route: string,
    status: string
  ): number {
    const id = this.nextId.flights++;
    this.flights.push({
      id,
      student_id,
      instructor_id,
      plane_id,
      start_time,
      end_time,
      route,
      status,
    });
    return id;
  }

  getFlights(): Flight[] {
    return [...this.flights];
  }

  getFlight(id: number): Flight | undefined {
    return this.flights.find(f => f.id === id);
  }

  updateFlight(
    id: number,
    updates: Partial<Omit<Flight, 'id'>>
  ): boolean {
    const index = this.flights.findIndex(f => f.id === id);
    if (index === -1) return false;
    this.flights[index] = { ...this.flights[index], ...updates };
    return true;
  }

  deleteFlight(id: number): boolean {
    const index = this.flights.findIndex(f => f.id === id);
    if (index === -1) return false;
    this.flights.splice(index, 1);
    return true;
  }

  deleteFlights(condition: (f: Flight) => boolean): number {
    const initialLength = this.flights.length;
    this.flights = this.flights.filter(f => !condition(f));
    return initialLength - this.flights.length;
  }

  // Weather Events
  addWeatherEvent(
    start_time: string,
    end_time: string,
    affected_routes: string,
    condition: string
  ): number {
    const id = this.nextId.weatherEvents++;
    this.weatherEvents.push({
      id,
      start_time,
      end_time,
      affected_routes,
      condition,
    });
    return id;
  }

  getWeatherEvents(): WeatherEvent[] {
    return [...this.weatherEvents];
  }

  getWeatherEvent(id: number): WeatherEvent | undefined {
    return this.weatherEvents.find(w => w.id === id);
  }

  deleteWeatherEvents(condition: (w: WeatherEvent) => boolean): number {
    const initialLength = this.weatherEvents.length;
    this.weatherEvents = this.weatherEvents.filter(w => !condition(w));
    return initialLength - this.weatherEvents.length;
  }

  // Alerts
  addAlert(timestamp: string, message: string): number {
    const id = this.nextId.alerts++;
    this.alerts.push({ id, timestamp, message });
    return id;
  }

  getAlerts(limit?: number): Alert[] {
    const alerts = [...this.alerts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? alerts.slice(0, limit) : alerts;
  }

  // Simulation Time
  getSimulationTime(): string {
    return this.simulationTime;
  }

  setSimulationTime(time: string): void {
    this.simulationTime = time;
  }

  // Clear all data (for cleanup/reset)
  clearAll(): void {
    this.students = [];
    this.instructors = [];
    this.planes = [];
    this.flights = [];
    this.weatherEvents = [];
    this.alerts = [];
    this.nextId = {
      students: 1,
      instructors: 1,
      planes: 1,
      flights: 1,
      weatherEvents: 1,
      alerts: 1,
    };
    this.simulationTime = new Date().toISOString();
  }

  // Clear specific data
  clearFlights(): void {
    this.flights = [];
    this.nextId.flights = 1;
  }

  clearWeatherEvents(): void {
    this.weatherEvents = [];
    this.nextId.weatherEvents = 1;
  }

  clearAlerts(): void {
    this.alerts = [];
    this.nextId.alerts = 1;
  }
}

export const store = new InMemoryStore();

