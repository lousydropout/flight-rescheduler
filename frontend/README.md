# Flight Rescheduler Frontend

React + TypeScript frontend for the Flight Lesson Rescheduler application.

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## Features

- **Real-time Dashboard**: Auto-refreshes every 3 seconds to show latest flight data
- **Flight Board**: Table showing all flights with status indicators
- **Weather Events**: Display of active weather events affecting routes
- **Alerts Feed**: Real-time alerts for weather, cancellations, and reschedules
- **Route Status**: Visual indicators showing which routes are clear or unsafe
- **Simulation Clock**: Shows current simulation time from backend
- **Manual Rescheduling**: Click on "affected" flights to open calendar modal and reschedule
- **Action Buttons**:
  - Seed Database
  - Simulate Weather (Now, +1hr, +3hrs, +1 day)
  - Fast Forward Time
  - Cleanup/Reset

## Getting Started

### Installation

```bash
bun install
```

### Development

```bash
bun dev
```

Runs on `http://localhost:5173` by default.

### Build

```bash
bun run build
```

Outputs to `dist/` directory.

### Environment Variables

Create a `.env` file (optional):

```env
VITE_API_BASE=http://localhost:3000
```

If not set, defaults to `http://localhost:3000`.

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main dashboard component
│   ├── main.tsx             # React entry point
│   ├── App.css              # App-specific styles
│   ├── index.css            # Global styles
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   │       ├── button.tsx
│   │       └── card.tsx
│   └── lib/
│       └── utils.ts         # Utility functions
├── public/                  # Static assets
└── tailwind.config.js      # Tailwind configuration
```

## Key Components

### App.tsx

Main dashboard component that:
- Fetches data from backend API every 3 seconds
- Displays flights, weather, alerts, and routes
- Handles user interactions (rescheduling, actions)
- Shows calendar modal for rescheduling affected flights

### Status Colors

- **scheduled**: Green
- **in_progress**: Blue
- **completed**: Purple
- **affected**: Yellow (clickable)
- **cancelled**: Red

## API Integration

The frontend communicates with the backend via REST API:

- `GET /flights` - Fetch all flights
- `GET /weather` - Fetch active weather events
- `GET /alerts` - Fetch latest alerts
- `GET /time` - Fetch simulation time
- `GET /routes` - Fetch route statuses
- `POST /seed` - Seed database
- `POST /simulate-weather` - Create weather event
- `POST /time/fast-forward` - Advance time
- `POST /cleanup` - Reset simulation
- `POST /flights/:id/available-slots` - Get available slots
- `POST /flights/:id/reschedule` - Reschedule flight

## Development Notes

- Uses `fetch` API for all HTTP requests
- Auto-refresh implemented with `setInterval` in `useEffect`
- Modal state managed with React hooks
- Responsive design with Tailwind CSS grid and flexbox
- Error handling via try/catch and user alerts
