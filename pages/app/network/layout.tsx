import type { Metadata } from "next";
import { NetworkHeader } from "@/components/network/network-header";
import styles from "./network.module.css";

export const metadata: Metadata = {
  title: {
    default: "Crown Network | Find senior care with confidence",
    template: "%s | Crown Network",
  },
  description:
    "Explore senior living and care providers, compare services, and connect with options that fit your family.",
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <NetworkHeader />
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <strong>Crown Network</strong>
            <br />
            A Crown Pages service
          </div>
          <div className={styles.footerDisclosure}>
            Facility listings are available at no cost. Participating providers may compensate Crown Network
            when a family chooses their services. Compensation does not determine organic search order.
          </div>
        </div>
      </footer>
    </div>
  );
}
