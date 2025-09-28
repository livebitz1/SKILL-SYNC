"use client"

import Link from "next/link"
import React, { useEffect, useState } from 'react'
import { BookOpen, GitMerge, UserCheck, Monitor, Zap, MessageSquare, Video, FileText, Users as LucideUsers, Star } from 'lucide-react'

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

  // --- Card rotator data + state ---
  const cards = [
    { title: 'Skill Training', subtitle: 'Guided paths and hands-on modules to build mastery.', accent: 'green-600', icon: BookOpen },
    { title: 'Project Collaboration', subtitle: 'Team up on real projects to ship and showcase work.', accent: 'emerald-600', icon: GitMerge },
    { title: 'Mentorship', subtitle: 'Connect with experienced mentors for focused guidance.', accent: 'teal-600', icon: UserCheck },
    { title: 'Showcase', subtitle: 'Polish and present your projects to the community.', accent: 'lime-600', icon: Monitor },
    { title: 'Challenges', subtitle: 'Real-world tasks designed to accelerate learning.', accent: 'green-700', icon: Zap },
    { title: 'Peer Review', subtitle: 'Get constructive feedback from fellow learners.', accent: 'emerald-700', icon: MessageSquare },
    { title: 'Workshops', subtitle: 'Live and recorded sessions led by industry practitioners.', accent: 'teal-700', icon: Video },
    { title: 'Resources', subtitle: 'Curated materials to support every learning journey.', accent: 'lime-700', icon: FileText },
    { title: 'Networking', subtitle: 'Build relationships that lead to real opportunities.', accent: 'green-800', icon: LucideUsers },
    { title: 'Innovation Lab', subtitle: 'Experiment, prototype, and iterate on bold ideas.', accent: 'emerald-800', icon: Star },
  ]

  // map the named accents to concrete colors (keeps Tailwind purge happy and avoids dynamic classes)
  const accentMap: Record<string, string> = {
    'green-600': '#16a34a',
    'emerald-600': '#059669',
    'teal-600': '#0d9488',
    'lime-600': '#84cc16',
    'green-700': '#15803d',
    'emerald-700': '#047857',
    'teal-700': '#0f766e',
    'lime-700': '#65a30d',
    'green-800': '#166534',
    'emerald-800': '#065f46',
  }

  const [cardIndex, setCardIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const intervalRef = React.useRef<number | null>(null)
  const timeoutRef = React.useRef<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const copyTimeoutRef = React.useRef<number | null>(null)

  useEffect(() => {
    // start rotating every 2s; perform a short crossfade when swapping
    const start = () => {
      if (intervalRef.current) return
      intervalRef.current = window.setInterval(() => {
         setVisible(false)
         // small gap to allow fade-out, then swap and fade-in
         timeoutRef.current = window.setTimeout(() => {
           setCardIndex((i) => (i + 1) % cards.length)
           setVisible(true)
         }, 350)
      }, 3500)
    }

    const stop = () => {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null }
      if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null }
    }

    start()
    return () => stop()
  }, [cards.length])

  const handleLogoClick = async (i: number) => {
    try {
      await navigator.clipboard.writeText(cards[i].title)
      setCopiedIndex(i)
      if (copyTimeoutRef.current) { window.clearTimeout(copyTimeoutRef.current); copyTimeoutRef.current = null }
      copyTimeoutRef.current = window.setTimeout(() => setCopiedIndex(null), 1400)
    } catch (e) {
      // ignore clipboard errors silently
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) { window.clearTimeout(copyTimeoutRef.current); copyTimeoutRef.current = null }
    }
  }, [])

  const goToCard = (i: number) => {
    // immediate controlled jump with brief fade
    if (i === cardIndex) return
    if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null }
    setVisible(false)
    window.setTimeout(() => {
      setCardIndex(i)
      setVisible(true)
    }, 240)
  }

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
          <div className="mt-10 md:mt-12">  
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
        <div className="mx-auto max-w-4xl">
          {/* Card Rotator - shows one card at a time and transitions every 2s */}
          <div className="relative flex flex-col items-center">
            <div className="w-full">
              {/* Rotator container */}
              <div className="relative mx-auto w-full max-w-3xl">
                {/* Card viewport (fixed height to avoid layout shift) */}
                <div className="h-40 md:h-44" aria-hidden="true" />

                {/* Card element */}
                <div className="relative -mt-44 md:-mt-44 flex justify-center">
                  <div className={`w-full px-4 transition-all duration-500 ease-out transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
                    <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-md ring-1 ring-black/5">
                      <div className="flex items-start gap-4">
                        <button
                          aria-label={`Copy ${cards[cardIndex].title}`}
                          title={`Copy ${cards[cardIndex].title}`}
                          onClick={() => handleLogoClick(cardIndex)}
                          className="shrink-0 mt-1 h-12 w-12 rounded-lg flex items-center justify-center text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                          style={{
                            background: `linear-gradient(135deg, ${accentMap[cards[cardIndex].accent] || '#16a34a'} 0%, ${accentMap[cards[cardIndex].accent] || '#16a34a'} 100%)`,
                            boxShadow: `0 6px 22px ${accentMap[cards[cardIndex].accent]}33`,
                          }}
                        >
                          {/* professional lucide icon */}
                          {React.createElement(cards[cardIndex].icon, { className: 'h-6 w-6', 'aria-hidden': true })}
                        </button>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{cards[cardIndex].title}</h3>
                          <p className="mt-2 text-sm leading-6 text-foreground/70">{cards[cardIndex].subtitle}</p>
                        </div>
                        <div className="ml-auto hidden items-center gap-2 sm:flex">
                          <span className="inline-block rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/70">Featured</span>
                          {copiedIndex === cardIndex && (
                            <span className="inline-block rounded-full bg-green-50 text-green-700 px-2 py-1 text-xs font-medium">Copied!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pagination dots */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Show card ${i + 1}`}
                      onClick={() => goToCard(i)}
                      className={`h-2 w-8 rounded-full transition-all duration-300 ease-out ${i === cardIndex ? 'bg-green-700 scale-100' : 'bg-foreground/20 hover:bg-foreground/30 scale-90'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
