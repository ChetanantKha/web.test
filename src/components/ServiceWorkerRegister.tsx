"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installability is a nice-to-have; a failed registration shouldn't break the app
      });
    }
  }, []);

  return null;
}
