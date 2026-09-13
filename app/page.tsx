import { OrbisDemo } from "@/components/orbis-demo";

import styles from "./orbis.module.css";

export default function Home() {
  return (
    <div className={styles.shell}>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>Orbis starter</h1>
          <p>
            Connect, generate a continuous live video, then steer it by changing
            the prompt while it runs.
          </p>
        </header>
        <OrbisDemo />
      </main>
    </div>
  );
}
