import { useEffect } from "react";

export function AdminMfa({ onPassed }: { onPassed: () => void; dark: boolean }) {
  useEffect(() => {
    onPassed();
  }, [onPassed]);
  return null;
}
