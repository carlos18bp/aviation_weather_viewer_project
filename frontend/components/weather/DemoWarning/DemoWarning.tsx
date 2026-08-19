import styles from './DemoWarning.module.css';


export const DEMO_WARNING_TEXT =
  'DATOS SIMULADOS — PROTOTIPO DEMOSTRATIVO — NO APTO PARA USO OPERACIONAL';

export function DemoWarning() {
  return (
    <p
      className={styles.warning}
      role="note"
      aria-label="Advertencia de uso operacional"
    >
      {DEMO_WARNING_TEXT}
    </p>
  );
}
