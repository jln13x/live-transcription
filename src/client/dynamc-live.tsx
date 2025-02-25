"use client";

import dynamic from "next/dynamic";

export const DynamicLive = dynamic(
  () => import("@/client/live").then((m) => m.Live),
  {
    ssr: false,
  }
);
