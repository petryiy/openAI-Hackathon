import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plot as Proof · Adaptive learning drama",
  description:
    "Turn an abstract STEM question into a playable story where every choice changes how the concept is visualized.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
