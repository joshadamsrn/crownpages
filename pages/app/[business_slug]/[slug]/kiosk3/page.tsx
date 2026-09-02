import {
  KioskRoute,
  type KioskRouteProps,
  kioskMetadata,
  kioskViewport,
} from "../kiosk-page";

export const metadata = kioskMetadata;
export const viewport = kioskViewport;

export default async function Kiosk3Page(props: KioskRouteProps) {
  return KioskRoute({ ...props, variant: "intakeForm" });
}
