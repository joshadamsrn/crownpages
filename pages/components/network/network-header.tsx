import Image from "next/image";
import Link from "next/link";
import styles from "@/app/network/network.module.css";

export function NetworkHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/network" aria-label="Crown Network home">
          <span className={styles.brandMark}>
            <Image
              alt=""
              aria-hidden="true"
              className={styles.brandLogo}
              height={42}
              priority
              src="/crown-pages-release-icon.png"
              width={42}
            />
          </span>
          <span>
            <span className={styles.brandName}>Crown Network</span>
            <span className={styles.brandTagline}>Care options, clearly connected</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Crown Network navigation">
          <Link className={styles.navLink} href="/network#search">
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
