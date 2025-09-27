"use client"

import Link from "next/link"

export default function HeroSection() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-pretty text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          <span className="text-green-700">Learn Skills.</span> Build Projects.{" "}
          <span className="text-green-700">Collaborate</span> Across Institutions.
        </h1>
        <p className="mt-4 text-balance text-base leading-relaxed text-foreground/70 md:text-lg">
          A platform where learners, mentors, and collaborators connect to gain real-world experience.
        </p>
        <div className="mt-8">  
          <Link
            href="/skills"
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mt-16 md:mt-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold text-foreground">Skill Training</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/70">
              Guided paths and hands-on modules to master in-demand skills with clarity and confidence.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold text-foreground">Project Collaboration</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/70">
              Team up on real projects across institutions to build, ship, and showcase your work.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold text-foreground">Community</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/70">
              Connect with mentors and peers, share knowledge, and grow a professional network.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
