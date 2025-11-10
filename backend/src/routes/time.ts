import { store } from "../store";

export function getSimulationTime() {
  return store.getSimulationTime();
}

export function advanceTimeByMinutes(minutes: number) {
  const currentTime = getSimulationTime();
  const currentDate = new Date(currentTime);
  const newDate = new Date(currentDate);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  const newTime = newDate.toISOString();
  store.setSimulationTime(newTime);
  return newTime;
}

export function fastForwardTime() {
  const currentTime = getSimulationTime();
  const currentDate = new Date(currentTime);
  const nextHour = currentDate.getHours() + 1;
  const fastForwardedDate = new Date(currentDate);
  fastForwardedDate.setHours(nextHour, 0, 0, 0);
  fastForwardedDate.setMinutes(0);
  fastForwardedDate.setSeconds(0);
  fastForwardedDate.setMilliseconds(0);
  const newTime = fastForwardedDate.toISOString();
  store.setSimulationTime(newTime);
  return newTime;
}

