export const KIOSK_HOME_ROUTES = ["kiosk", "kiosk2", "kiosk3", "kiosk4"] as const;

export type KioskHomeRoute = (typeof KIOSK_HOME_ROUTES)[number];

export function parseKioskHomeRoute(
  value: unknown,
  fallback: KioskHomeRoute = "kiosk2",
): KioskHomeRoute {
  return typeof value === "string" && KIOSK_HOME_ROUTES.includes(value as KioskHomeRoute)
    ? (value as KioskHomeRoute)
    : fallback;
}
