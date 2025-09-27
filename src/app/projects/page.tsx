"use client"

import React, { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Filter, Users, Calendar, Eye, Plus, Check, Trash } from "lucide-react"
import { useUser } from '@clerk/nextjs'
import { toast } from 'react-hot-toast'

type Difficulty = "Beginner" | "Intermediate" | "Advanced"

type Project = {
  id: string
  title: string
  shortDescription: string
  description: string
  category: string
  difficulty: Difficulty
  durationWeeks: number | null
  status: "Open" | "Closed"
  requiredSkills: string[]
  collaborators: { id: string; name: string; avatar?: string; role?: string }[]
  creator: { id: string; name: string; avatar?: string; role?: string }
  bannerUrl?: string | null
  attachments?: string[]
  featured?: boolean
}

export default function ProjectsPage() {
  const { user } = useUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("All")
  const [difficulty, setDifficulty] = useState<string>("All")
  const [status, setStatus] = useState<string>("All")
  const [maxDuration, setMaxDuration] = useState<number | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false)

  // Fetch projects from API with current filters
  async function fetchProjects() {
    try {
      if (abortRef.current) abortRef.current.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoadingProjects(true)
      setFetchError(null)
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category) params.set('category', category)
      if (difficulty) params.set('difficulty', difficulty)
      if (status) params.set('status', status)
      if (maxDuration !== null) params.set('maxDuration', String(maxDuration))

      const res = await fetch(`/api/projects?${params.toString()}`, { signal: ac.signal })
      if (!res.ok) {
        // set a user-visible error and bail out quietly
        setFetchError('Unable to load projects. Please try again later.')
        setProjects([])
        return
      }
      const data = await res.json()
      setProjects(data)
      setFetchError(null)
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return
      // avoid noisy console errors in production; set compact error state
      setFetchError('Unable to load projects. Please try again later.')
    } finally {
      setLoadingProjects(false)
    }
  }

  // debounce effect for fetching when filters change
  useEffect(() => {
    if (fetchRef.current) window.clearTimeout(fetchRef.current)
    fetchRef.current = window.setTimeout(() => {
      fetchProjects()
    }, 300)
    return () => {
      if (fetchRef.current) window.clearTimeout(fetchRef.current)
    }
  }, [query, category, difficulty, status, maxDuration])

  // modal
  const [selected, setSelected] = useState<Project | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // my projects (joined)
  const [myProjects, setMyProjects] = useState<Project[]>([])

  const categories = useMemo(() => ["All", "Web Development", "Design", "AI", "Marketing"], [])
  const difficulties = useMemo(() => ["All", "Beginner", "Intermediate", "Advanced"], [])

  // Prompt user to confirm delete — opens modal
  function promptDeleteProject(p: Project) {
    setProjectToDelete(p)
    setConfirmOpen(true)
  }

  // Perform deletion (used by the modal confirm)
  async function handleDeleteProject(p?: Project) {
    const target = p ?? projectToDelete
    if (!target?.id) return
    try {
      setDeletingId(target.id)
      const res = await fetch(`/api/projects?id=${encodeURIComponent(target.id)}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'Failed to delete project')
        return
      }
      // remove from local lists
      setProjects((s) => s.filter((x) => x.id !== target.id))
      setMyProjects((s) => s.filter((x) => x.id !== target.id))
      toast.success('Project deleted')
    } catch (err) {
      console.error('Delete failed', err)
      toast.error('Failed to delete project')
    } finally {
      setDeletingId(null)
      setProjectToDelete(null)
      setConfirmOpen(false)
    }
  }

  // When using the API for filtering, the server returns already-filtered projects
  const filtered = projects

  const featured = useMemo(() => projects.filter((p) => p.featured).slice(0, 3), [projects])

  const ownedProjects = useMemo(() => {
    if (!user) return []
    return projects.filter((p) => String(p.creator?.id) === String(user.id))
  }, [projects, user])

  function openDetails(p: Project) {
    setSelected(p)
    setIsOpen(true)
  }

  function applyToJoin(p: Project) {
    // naive local join: add current user placeholder to collaborators and to myProjects
    const already = myProjects.find((m) => m.id === p.id)
    if (already) return
    const joined = { ...p, collaborators: [...p.collaborators, { id: "me", name: "You" }] }
    setMyProjects((s) => [joined, ...s])
    setIsOpen(false)
  }

  function joinFromCard(p: Project) {
    applyToJoin(p)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl font-semibold text-green-700">Collaborate on Real Projects</h1>
          <p className="mt-2 text-gray-700 max-w-2xl">Work with peers, apply your skills, and build your portfolio.</p>

          {/* Search & filters */}
          <div className="mt-6">
            {fetchError && (
              <div className="mb-3 rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                {fetchError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 w-5 h-5" />
                <input
                  aria-label="Search projects"
                  placeholder="Search projects, skills, keywords..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-full bg-white text-sm placeholder-gray-400 focus:outline-none"
                />
              </div>

              {/* Filter toggle - visible on small screens */}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 md:hidden"
                onClick={() => setShowFilters((s) => !s)}
                aria-expanded={showFilters}
              >
                <Filter className="w-4 h-4 text-green-600" />
                <span>Filters</span>
              </button>

              {/* Desktop filters */}
              <div className="hidden md:flex md:items-center md:gap-3 md:ml-4">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="p-2 border border-gray-200 rounded-full bg-white text-sm"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="p-2 border border-gray-200 rounded-full bg-white text-sm"
                >
                  {difficulties.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="p-2 border border-gray-200 rounded-full bg-white text-sm"
                >
                  <option>All</option>
                  <option>Open</option>
                  <option>Closed</option>
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Max wk"
                  value={maxDuration ?? ""}
                  onChange={(e) => setMaxDuration(e.target.value ? Number(e.target.value) : null)}
                  className="w-24 p-2 border border-gray-200 rounded-full bg-white text-sm"
                />
              </div>
            </div>

            {/* Collapsible filters for small screens */}
            {showFilters && (
              <div className="mt-4 space-y-3 md:hidden">
                <div>
                  <label className="text-xs font-medium text-gray-600">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-200 rounded-full bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-200 rounded-full bg-white"
                  >
                    {difficulties.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">Max Duration (weeks)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g., 6"
                      value={maxDuration ?? ""}
                      onChange={(e) => setMaxDuration(e.target.value ? Number(e.target.value) : null)}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-full bg-white"
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-xs font-medium text-gray-600">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-full bg-white"
                    >
                      <option>All</option>
                      <option>Open</option>
                      <option>Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {/* Featured / Recommended */}
        {featured.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800">Recommended for you</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map((f) => (
                <article key={f.id} className="rounded-lg border-2 border-black bg-white p-0 overflow-hidden flex flex-col justify-between min-h-[14rem]">
                  <div className="relative">
                    {f.featured && (
                      <div className="absolute left-3 top-3 bg-green-700 text-white text-xs font-medium px-2 py-1 rounded">Featured</div>
                    )}
                    {f.bannerUrl ? (
                      <div className="w-full">
                        <img src={f.bannerUrl} alt={f.title} className="w-full h-40 object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-gray-50" />
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">{f.shortDescription}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {f.requiredSkills && f.requiredSkills.length > 0 ? (
                          f.requiredSkills.slice(0, 4).map((s: string) => (
                            <Badge key={s} className="bg-green-50 text-green-700 border-green-100 text-xs px-2 py-0.5 rounded">{s}</Badge>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500">No skills specified</div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
               ))}
            </div>
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Filter className="w-4 h-4 text-green-600" />
              <span>{filtered.length} projects</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <article key={p.id} className="rounded-lg border-2 border-black bg-white overflow-hidden flex flex-col min-h-[18rem]">
                {/* banner area */}
                {p.bannerUrl ? (
                  <div className="w-full">
                    <img src={p.bannerUrl} alt={p.title} className="w-full h-48 object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-24 bg-gray-50" />
                )}
                <div className="flex-1 p-4 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-3">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                      <p className="mt-2 text-xs text-gray-600 line-clamp-2">{p.shortDescription}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {p.requiredSkills && p.requiredSkills.length > 0 ? (
                          p.requiredSkills.slice(0, 4).map((s: string) => (
                            <Badge key={s} className="bg-green-50 text-green-700 border-green-100 text-xs px-2 py-0.5 rounded">{s}</Badge>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500">No skills specified</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {p.creator?.avatar ? (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={p.creator.avatar} alt={p.creator.name} />
                          <AvatarFallback>{p.creator.name?.[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600">{p.creator?.name?.[0] ?? 'U'}</div>
                      )}
                      <div className="text-xs text-gray-600">{p.durationWeeks} wk • {p.difficulty}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-500" />{p.durationWeeks} wk</div>
                    <div className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">{p.difficulty}</div>
                    <div className="flex items-center gap-1"><Users className="w-4 h-4 text-gray-500" />{p.collaborators.length}</div>
                  </div>
                </div>

                <div className="mt-3 w-full flex items-center gap-3 p-4 pt-0">
                  <Button className="flex-1 bg-green-600 text-white py-2 text-sm rounded-md" onClick={() => joinFromCard(p)}>
                    Join Project
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDetails(p)} aria-label={`Inspect ${p.title}`}>
                    <Eye className="w-4 h-4 text-green-600" />
                  </Button>

                  {/* Delete control shown only to creator */}
                  {user && String(user.id) === String(p.creator?.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => promptDeleteProject(p)}
                      aria-label={`Delete ${p.title}`}
                      disabled={deletingId === p.id}
                      className="border border-gray-800 text-gray-800 bg-white rounded-md p-2 hover:bg-black hover:text-white transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* My Projects */}
        <section className="mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
            <Link href="/projects/create">
              <Button variant="outline" className="border-green-600 text-green-700">Start Your Own Project</Button>
            </Link>
          </div>

          <div className="mt-4">
            {myProjects.length === 0 ? (
              <div className="py-8 text-center text-gray-600">You haven't joined any projects yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                {myProjects.map((m) => (
                  <div key={m.id} className="rounded-lg border-2 border-black p-4 bg-white flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                      <div className="text-xs text-gray-600">Role: Collaborator • Progress: 25%</div>
                    </div>
                    <div>
                      <Button variant="secondary" className="bg-green-600 text-white">Continue Collaboration</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Manage your projects - for creators only */}
        {user && (
          <section className="mb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Manage your projects</h2>
              <span className="text-sm text-gray-600">{ownedProjects.length} created</span>
            </div>

            <div className="mt-4">
              {ownedProjects.length === 0 ? (
                <div className="py-6 text-center text-gray-600">You haven't created any projects yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ownedProjects.map((op) => (
                    <div key={op.id} className="rounded-md border-2 border-black p-3 bg-white flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{op.title}</h3>
                        <div className="text-xs text-gray-600">{op.requiredSkills?.slice(0,3).join(', ')}{op.requiredSkills && op.requiredSkills.length > 3 ? '…' : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/projects/${op.id}`}>
                          <Button variant="ghost" className="text-sm border border-gray-200 px-3 py-1 rounded-md">View</Button>
                        </Link>
                        <Button
                          onClick={() => promptDeleteProject(op)}
                          disabled={deletingId === op.id}
                          className="text-sm border border-gray-800 text-gray-900 bg-white px-3 py-1 rounded-md hover:bg-black hover:text-white transition-colors"
                        >
                          {deletingId === op.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="rounded-lg border-2 border-black bg-white p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Want to start something new?</h3>
          <p className="mt-2 text-gray-600">Create a project, gather a team, and ship value together.</p>
          <div className="mt-4">
            <Link href="/projects/create">
              <Button className="bg-green-600 text-white px-6 py-2 rounded-full">
                <Plus className="w-4 h-4 mr-2" /> Start Your Own Project
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Project Detail Modal */}
      <Dialog open={isOpen} onOpenChange={(o) => setIsOpen(o)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.shortDescription}</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selected.creator.avatar} alt={selected.creator.name} />
                  <AvatarFallback>{selected.creator.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-gray-900">{selected.creator.name}</div>
                  <div className="text-xs text-gray-600">{selected.creator?.role ? `${selected.creator.role} • ` : ''}{selected.category}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">About this project</h4>
                <p className="mt-2 text-sm text-gray-700">{selected.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Skills required</h4>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {selected.requiredSkills.map((s) => (
                    <Badge key={s} className="bg-green-50 text-green-700 border-green-100">{s}</Badge>
                  ))}
                </div>
              </div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Attachments</h4>
                  <div className="mt-2 flex flex-col gap-2">
                    {selected.attachments.map((a: string, idx: number) => (
                      <a key={idx} href={a} target="_blank" rel="noreferrer" className="text-sm text-green-700 underline">{a}</a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Timeline: {selected.durationWeeks} weeks</div>
                <div className="text-sm text-gray-700">Status: <span className={`ml-1 font-medium ${selected.status === 'Open' ? 'text-green-700' : 'text-gray-600'}`}>{selected.status}</span></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Team members</h4>
                <div className="mt-2 flex items-center gap-2">
                  {selected.collaborators.length === 0 ? (
                    <div className="text-sm text-gray-600">No collaborators yet</div>
                  ) : (
                    selected.collaborators.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={c.avatar} alt={c.name} />
                          <AvatarFallback>{c.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">{c.name}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button className="bg-green-600 text-white" onClick={() => applyToJoin(selected)}>
                  <Check className="w-4 h-4 mr-2" /> Apply to Join
                </Button>
              </div>

            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-600">Loading…</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={(o) => setConfirmOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>Are you sure you want to delete this project? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="text-sm text-gray-800 font-medium">{projectToDelete?.title}</div>
            <div className="mt-2 text-sm text-gray-600">{projectToDelete?.shortDescription}</div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => handleDeleteProject()}
              className="bg-black text-white px-4 py-2 rounded-md"
              disabled={deletingId === projectToDelete?.id}
            >
              {deletingId === projectToDelete?.id ? 'Deleting…' : 'Delete project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
