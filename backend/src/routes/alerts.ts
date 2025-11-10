import { store } from "../store";

export function getAllAlerts() {
  // Get latest 50 alerts
  return store.getAlerts(50);
}

