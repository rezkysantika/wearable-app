// app/layout.tsx
import "./globals.css";
import { Lexend } from "next/font/google";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const metadata = {
  title: "Wearable Feedback",
  description: "Software prototype for wearable feedback research project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
