# Flight Lesson Rescheduler

A flight school lesson rescheduling simulation system that automatically manages flight schedules when weather events occur. The system tracks flights, instructors, students, and planes, and provides a manual rescheduling interface when flights are affected by weather.

## Features

- **Simulation Time Management**: Centralized simulation clock that advances automatically (10 minutes every 10 seconds)
- **Automatic Flight Status Progression**: Flights automatically transition through `scheduled` → `in_progress` → `completed` based on simulation time
- **Weather Simulation**: Create weather events with relative timing (now, +1hr, +3hrs, +1 day)
- **Automatic Safety Checks**: Flights are automatically marked as "affected" when weather events overlap with their schedule
- **Manual Rescheduling**: Click on "affected" flights to view available time slots and reschedule
- **Auto-Cancellation**: Affected flights that aren't rescheduled before the storm arrives are automatically cancelled
- **Dynamic Flight Board**: Old completed flights are removed and new scheduled flights are generated automatically
- **Real-time Dashboard**: React frontend with auto-refresh showing flights, weather, alerts, and route status

## Tech Stack

**Backend:**
- Bun runtime
- Hono web framework
- In-memory data store (TypeScript classes)
- TypeScript

**Frontend:**
- React 19
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

**Testing:**
- Bun test framework
- In-memory store for test isolation

## Project Structure

```
rescheduler/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Main Hono app with background processes
│   │   ├── store.ts           # In-memory data store
│   │   ├── db.ts              # Minimal test data (legacy)
│   │   └── routes/
│   │       ├── seed.ts        # Database seeding
│   │       ├── weather.ts     # Weather simulation
│   │       ├── safety.ts      # Safety checks (marks flights as affected)
│   │       ├── calendar.ts    # Available slots & rescheduling
│   │       ├── flights.ts     # Flight status updates & generation
│   │       ├── alerts.ts      # Alert retrieval
│   │       ├── time.ts        # Simulation time management
│   │       ├── cleanup.ts     # Reset simulation
│   │       └── routes.ts     # Route status
│   └── tests/                 # Test suite
└── frontend/
    ├── src/
    │   ├── App.tsx           # Main dashboard
    │   ├── components/ui/   # shadcn/ui components
    │   └── lib/utils.ts      # Utility functions
    └── tailwind.config.js    # Tailwind configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Backend
cd backend
bun install

# Frontend
cd ../frontend
bun install
```

### Running the Application

**Backend:**
```bash
cd backend
bun run dev  # Runs on http://localhost:3000
```

**Frontend:**
```bash
cd frontend
bun dev  # Runs on http://localhost:5173
```

The frontend will automatically connect to the backend API.

### Running Tests

```bash
cd backend
bun test  # Run all tests
```

## API Endpoints

### GET Endpoints

- `GET /` - Health check
- `GET /flights` - All flights with student/instructor/plane data
- `GET /weather` - Active weather events
- `GET /alerts` - Latest 50 alerts
- `GET /time` - Current simulation time
- `GET /routes` - All routes with weather status (clear/unsafe)

### POST Endpoints

- `POST /seed` - Seed the database with initial data
- `POST /simulate-weather` - Create weather event
  - Body: `{ condition?: string, duration_hours?: number, start_time?: string }`
  - Automatically runs safety check after creating weather
- `POST /safety-check` - Manually run safety check (also runs automatically after weather)
- `POST /cleanup` - Reset simulation (clear weather, restore flights)
- `POST /time/fast-forward` - Advance simulation time by 1 hour
- `POST /flights/:id/available-slots` - Get available time slots for rescheduling
- `POST /flights/:id/reschedule` - Reschedule a flight
  - Body: `{ start_time: string, end_time: string, instructor_id: number, plane_id: number }`

## Flight Statuses

- **scheduled**: Flight is scheduled for future
- **in_progress**: Flight is currently happening (simulation time is within flight window)
- **completed**: Flight has finished
- **affected**: Flight overlaps with weather event (click to reschedule)
- **cancelled**: Flight was not rescheduled before storm arrived

## Background Processes

The backend runs several background processes every 10 seconds:

1. **Time Advancement**: Advances simulation time by 10 minutes
2. **Flight Status Updates**: Updates flight statuses based on simulation time
3. **Flight Board Maintenance**: Removes old completed flights and generates new scheduled flights

## Usage Flow

1. **Seed the database**: Click "Seed Database" to populate with initial data
2. **Simulate weather**: Use one of the weather buttons to create a weather event
3. **View affected flights**: Flights overlapping with weather are marked as "affected" (yellow, clickable)
4. **Reschedule flights**: Click on an "affected" flight to see available time slots and reschedule
5. **Auto-cancellation**: If a flight isn't rescheduled before the storm arrives, it's automatically cancelled

## Development

### Environment Variables

**Frontend:**
- `VITE_API_BASE=http://localhost:3000` (optional, defaults to this)

### Code Style

- TypeScript strict mode enabled
- ESLint configured for React and TypeScript
- Prettier formatting (via ESLint)

## License

MIT

