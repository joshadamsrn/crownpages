import {
  KioskRoute,
  type KioskRouteProps,
  kioskMetadata,
  kioskViewport,
} from "../kiosk-page";

export const metadata = kioskMetadata;
export const viewport = kioskViewport;

export default async function KioskPage(props: KioskRouteProps) {
  return KioskRoute(props);
}
