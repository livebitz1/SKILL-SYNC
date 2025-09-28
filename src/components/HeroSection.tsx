"use client"

import Link from "next/link"
import React, { useEffect, useState } from 'react'

export default function HeroSection() {
  // words to rotate (at least 10) — keep punctuation so sentence reads correctly
  const rotatingWords = [
    'Institutions.',
    'Universities.',
    'Teams.',
    'Communities.',
    'Learners.',
    'Mentors.',
    'Creators.',
    'Collaborators.',
    'Projects.',
    'Skills.',
    'Innovators.',
    'Researchers.'
  ]

  // compute the maximum visual width (approx) using character count and reserve that space
  const maxWordLength = Math.max(...rotatingWords.map((w) => w.length))
  // reserve width and center content both vertically and horizontally to avoid layout shift
  const rotatingContainerStyle: React.CSSProperties = {
    minWidth: `${maxWordLength}ch`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  // index for current rotating word
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % rotatingWords.length)
    }, 1000) // change every second
    return () => clearInterval(interval)
  }, [rotatingWords.length])

  // generate a small set of left/right particles with varied size, delay and duration
  const makeParticles = (side: 'left' | 'right', count = 6) =>
    Array.from({ length: count }).map((_, i) => {
      // deterministic-ish variation using index
      const top = 6 + (i * 13) % 82 // spread vertically
      // smaller sizes: 4,6,8,10
      const size = 4 + (i % 4) * 2
      // gentle staggering
      const delay = (i * 0.45) % 2.2
      // slow durations so motion is slow and calming
      const duration = 6 + ((i % 4) * 0.8) // ~6s - 8.4s
      return { side, top, size, delay, duration }
    })

  const leftParticles = makeParticles('left', 6)
  const rightParticles = makeParticles('right', 6)

  const currentWord = rotatingWords[index]

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-20">
      {/* Particle layer sits behind the hero text but inside the main hero area */}
      <div className="relative">
        <div className="particle-layer" aria-hidden="true" role="presentation">
          {leftParticles.map((p, i) => (
            <div
              key={`l-${i}`}
              className="particle left"
              style={{
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                opacity: 0.95,
              }}
            />
          ))}
          {rightParticles.map((p, i) => (
            <div
              key={`r-${i}`}
              className="particle right"
              style={{
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay + 0.12}s`,
                animationDuration: `${p.duration}s`,
                opacity: 0.95,
              }}
            />
          ))}
        </div>

        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-pretty text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            <span className="text-green-700">Learn Skills.</span> Build Projects.{" "}
            <span className="text-green-700">Collaborate</span> Across{' '}
            {/* make the rotating word container use flex centering so the changing word stays centered */}
            <span className="rotating-container inline-flex items-center justify-center align-middle" style={rotatingContainerStyle}>
               {/* key forces re-mount so CSS entrance animation runs */}
               <span key={currentWord} className="rotating-word text-green-700">
                 {currentWord}
               </span>
             </span>
          </h1>
          <p className="mt-4 text-balance text-base leading-relaxed text-foreground/70 md:text-lg">
            A platform where learners, mentors, and collaborators connect to gain real-world experience.
          </p>
          <div className="mt-8">  
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              Get Started
            </Link>
          </div>
        </section>
      </div>

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
