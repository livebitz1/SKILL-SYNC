"use client"

import Link from "next/link"
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs"

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <nav aria-label="Primary" className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="sr-only">Skill Training and Project Collaboration</span>
          <Link href="/" className="text-xl font-semibold tracking-tight text-green-700">
            SkillCollab
          </Link>
        </div>

        {/* Links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Home
          </Link>
          <Link href="/skills" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Skills
          </Link>
          <Link href="/projects" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Projects
          </Link>
          <Link href="/about" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            About
          </Link>
          <Link href="/learn" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Learn
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            Dashboard
          </Link>
        </div>

        {/* Auth: SignedIn -> UserButton, SignedOut -> SignIn button */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="inline-flex items-center justify-center rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                aria-label="Sign in"
              >
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}
