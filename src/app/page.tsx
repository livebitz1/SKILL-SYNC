"use client"

import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function HomePage() {
  const {  } = useUser();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <HeroSection />

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max_w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-foreground/70 md:flex-row md:px-6">
          <p className="order-2 md:order-1">© {new Date().getFullYear()} SkillCollab. All rights reserved.</p>
          <nav className="order-1 flex items-center gap-4 md:order-2" aria-label="Footer">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
