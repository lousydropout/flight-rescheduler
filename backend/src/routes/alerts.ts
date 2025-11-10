import { db } from "../db";

export function getAllAlerts() {
  // Get latest 50 alerts
  const alerts = db.query(`
    SELECT * FROM alerts
    ORDER BY timestamp DESC
    LIMIT 50
  `).all();
  
  return alerts;
}

