import Link from "next/link";
import { Crown } from "lucide-react";
import styles from "@/app/network/network.module.css";

export function NetworkHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/network" aria-label="Crown Network home">
          <span className={styles.brandMark}>
            <Crown size={20} strokeWidth={2.2} />
          </span>
          <span>
            <span className={styles.brandName}>Crown Network</span>
            <span className={styles.brandTagline}>Care options, clearly connected</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Crown Network navigation">
          <Link className={styles.navLink} href="/network#results">
            Find care
          </Link>
          <Link className={styles.navLink} href="/network#how-it-works">
            How it works
          </Link>
          <Link className={styles.navLink} href="/auth/login">
            Provider sign in
          </Link>
          <Link className={styles.providerLink} href="/network/get-help">
            Get personalized help
          </Link>
        </nav>
      </div>
    </header>
  );
}
