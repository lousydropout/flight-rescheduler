import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cloud, Plane, AlertCircle, RefreshCw, Clock, RotateCcw, FastForward } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

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

function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [weather, setWeather] = useState<WeatherEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulationTime, setSimulationTime] = useState<Date | null>(null);
  const [stormStartTime, setStormStartTime] = useState<string>('');

  const fetchData = async () => {
    try {
      const [flightsRes, weatherRes, alertsRes, timeRes, routesRes] = await Promise.all([
        fetch(`${API}/flights`).then(r => r.json()),
        fetch(`${API}/weather`).then(r => r.json()),
        fetch(`${API}/alerts`).then(r => r.json()),
        fetch(`${API}/time`).then(r => r.json()),
        fetch(`${API}/routes`).then(r => r.json())
      ]);
      setFlights(flightsRes);
      setWeather(weatherRes);
      setAlerts(alertsRes);
      setRoutes(routesRes);
      if (timeRes.current_time) {
        setSimulationTime(new Date(timeRes.current_time));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 3000);
    return () => clearInterval(id);
  }, []);

  const handleAction = async (endpoint: string, actionName: string, body?: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const result = await response.json();
      console.log(`${actionName} result:`, result);
      // Refresh data after action
      setTimeout(fetchData, 500);
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'rescheduled':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Flight Rescheduler Dashboard</h1>
            <p className="text-muted-foreground mt-2">Monitor and manage flight schedules</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-mono">
                {simulationTime ? (
                  <>
                    <div className="font-semibold text-foreground">
                      {simulationTime.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true 
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {simulationTime.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground italic mt-0.5">
                      Simulation Time
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">Loading...</div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await fetch(`${API}/time/fast-forward`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  const result = await response.json();
                  if (result.current_time) {
                    setSimulationTime(new Date(result.current_time));
                  }
                  setTimeout(fetchData, 500);
                } catch (error) {
                  console.error('Error fast forwarding:', error);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              title="Fast forward to next hour"
            >
              <FastForward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button
            onClick={() => handleAction('/seed', 'Seed')}
            disabled={loading}
            variant="default"
          >
            <Plane className={`mr-2 h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Processing...' : 'Seed Data'}
          </Button>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={stormStartTime}
              onChange={(e) => setStormStartTime(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              placeholder="Optional: Storm start time"
            />
            <Button
              onClick={async () => {
                setLoading(true);
                try {
                  const body: any = { condition: "storm", duration_hours: 3 };
                  if (stormStartTime) {
                    // Convert datetime-local to ISO string
                    const date = new Date(stormStartTime);
                    body.start_time = date.toISOString();
                  }
                  const response = await fetch(`${API}/simulate-weather`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                  });
                  const result = await response.json();
                  console.log('Simulate Weather result:', result);
                  setStormStartTime(''); // Clear after use
                  setTimeout(fetchData, 500);
                } catch (error) {
                  console.error('Error simulating weather:', error);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              variant="secondary"
            >
              <Cloud className="mr-2 h-4 w-4" />
              Simulate Weather
            </Button>
          </div>
          <Button
            onClick={() => handleAction('/safety-check', 'Safety Check')}
            disabled={loading || flights.length === 0}
            variant="destructive"
            title={flights.length === 0 ? "No flights to check" : "Check for flights affected by weather"}
          >
            <AlertCircle className={`mr-2 h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Checking...' : 'Safety Check'}
          </Button>
          <Button
            onClick={() => handleAction('/reschedule', 'Reschedule')}
            disabled={loading || flights.filter(f => f.status === 'cancelled').length === 0}
            variant="outline"
            title={flights.filter(f => f.status === 'cancelled').length === 0 ? "No cancelled flights to reschedule" : "Reschedule cancelled flights"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Rescheduling...' : 'Reschedule'}
          </Button>
          <Button
            onClick={() => handleAction('/cleanup', 'Reset Simulation')}
            disabled={loading}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Simulation
          </Button>
        </div>

        {/* Routes Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Route Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {routes.map((route) => (
                <div
                  key={route.route}
                  className={`px-4 py-2 rounded-lg border font-mono text-sm font-semibold ${
                    route.status === "clear"
                      ? "bg-green-50 border-green-300 text-green-800"
                      : "bg-red-50 border-red-300 text-red-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      route.status === "clear" ? "bg-green-500" : "bg-red-500"
                    }`} />
                    <span>{route.route.replace("–", " → ")}</span>
                    {route.weather_event && (
                      <span className="text-xs font-normal">
                        ({route.weather_event.condition})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Flights ({flights.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">ID</th>
                        <th className="text-left p-2 font-medium">Time</th>
                        <th className="text-left p-2 font-medium">Student</th>
                        <th className="text-left p-2 font-medium">Instructor</th>
                        <th className="text-left p-2 font-medium">Plane</th>
                        <th className="text-left p-2 font-medium">Route</th>
                        <th className="text-left p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flights.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            No flights found. Click "Seed Data" to populate.
                          </td>
                        </tr>
                      ) : (
                        flights.map((f) => (
                          <tr key={f.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{f.id}</td>
                            <td className="p-2 text-muted-foreground">{formatTime(f.start_time)}</td>
                            <td className="p-2">{f.student_name || 'N/A'}</td>
                            <td className="p-2">{f.instructor_name || 'N/A'}</td>
                            <td className="p-2 font-mono text-xs">{f.plane_tail_number || 'N/A'}</td>
                            <td className="p-2 font-mono text-xs">{f.route}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(f.status)}`}>
                                {f.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Weather Events ({weather.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weather.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active weather events</p>
                ) : (
                  <div className="space-y-3">
                    {weather.map((w) => (
                      <div
                        key={w.id}
                        className={`p-3 rounded-lg border ${
                          w.condition === 'storm'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-muted border-border'
                        }`}
                      >
                        <div className="font-semibold text-sm mb-1">{w.condition.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Routes: <span className="font-mono">{w.affected_routes}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(w.start_time)} - {formatTime(w.end_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Alerts ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {alerts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No alerts</p>
                  ) : (
                    alerts.slice(0, 20).map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-lg border bg-card text-sm"
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatTime(a.timestamp)}
                        </div>
                        <div className="text-foreground">{a.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
