import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vivid-Life | Live2D Outfit Plugin System",
  description: "AIコンパニオンが生命感を維持したまま衣装をプラグイン形式で切り替えるLive2Dシステム",
  keywords: ["Live2D", "Cubism", "WebGL", "PixiJS", "Outfit Plugin", "Vivid-Life", "Live2D着せ替え"],
  authors: [{ name: "Vivid-Life Project" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Vivid-Life | Live2D Outfit Plugin System",
    description: "生命感（Vividness）を維持したLive2D着せ替えプラグインシステム",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
