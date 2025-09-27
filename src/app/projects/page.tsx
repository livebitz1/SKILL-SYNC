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
   collaborators: ({ id: string; name: string; avatar?: string; role?: string; application?: { fullName?: string | null; contactInfo?: string | null; portfolioUrl?: string | null; skills?: string[]; preferredRole?: string | null; availability?: string | null; motivation?: string | null; agreedToGuidelines?: boolean; status?: string | null; acceptedAt?: string | null } })[]
   creator: { id: string; name: string; avatar?: string; role?: string }
   bannerUrl?: string | null
   attachments?: string[]
   featured?: boolean
 }

 type Applicant = {
   id?: string
   name?: string
   avatar?: string
   role?: string
   application?: {
     fullName?: string | null
     contactInfo?: string | null
     portfolioUrl?: string | null
     skills?: string[]
     preferredRole?: string | null
     availability?: string | null
     motivation?: string | null
     agreedToGuidelines?: boolean
     status?: string | null
     acceptedAt?: string | null
   } | null
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

  // Join application modal state
  const [joinProject, setJoinProject] = useState<Project | null>(null)
  const [joinOpen, setJoinOpen] = useState<boolean>(false)
  const [joining, setJoining] = useState<boolean>(false)
  const [joinForm, setJoinForm] = useState({
    fullName: '',
    contactInfo: '',
    portfolioUrl: '',
    skills: '',
    preferredRole: 'Frontend',
    availability: '',
    motivation: '',
    agreed: false,
  })

  // Fetch projects from API with current filters
  const fetchProjects = React.useCallback(async () => {
    try {
      // Abort previous request
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
        setFetchError('Unable to load projects. Please try again later.')
        setProjects([])
        return
      }
      const data = await res.json()
      setProjects(Array.isArray(data) ? (data as Project[]) : [])
      setFetchError(null)
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return
      setFetchError('Unable to load projects. Please try again later.')
    } finally {
      setLoadingProjects(false)
    }
  }, [query, category, difficulty, status, maxDuration])

  // debounce effect for fetching when filters change
  useEffect(() => {
    if (fetchRef.current) window.clearTimeout(fetchRef.current)
    fetchRef.current = window.setTimeout(() => {
      void fetchProjects()
    }, 300)
    return () => {
      if (fetchRef.current) window.clearTimeout(fetchRef.current)
    }
  }, [fetchProjects])

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
    // Open the join application modal for this project
    setJoinProject(p)
    // prefill form with user info when available
    if (user) {
      const u = user as unknown as Record<string, unknown>
      setJoinForm((f) => ({
        ...f,
        fullName: `${(u.firstName as string || '')} ${(u.lastName as string || '')}`.trim() || (u.fullName as string || ''),
        contactInfo: ((u.primaryEmailAddress as Record<string, unknown> | undefined)?.emailAddress as string | undefined) || (u.email as string | undefined) || (u.primaryEmail as string | undefined) || '',
        portfolioUrl: ((u.publicMetadata as Record<string, unknown> | undefined)?.portfolioUrl as string | undefined) || ((u.privateMetadata as Record<string, unknown> | undefined)?.portfolioUrl as string | undefined) || (u?.portfolioUrl as string | undefined) || '',
      }))
    }
    setJoinOpen(true)
    setIsOpen(false)
  }

  function joinFromCard(p: Project) {
    applyToJoin(p)
  }

  async function submitJoinApplication() {
    if (!joinProject) return
    if (!joinForm.agreed) {
      toast.error('You must agree to the project guidelines to apply.')
      return
    }
    try {
      setJoining(true)
      const payload = {
        projectId: joinProject.id,
        fullName: joinForm.fullName,
        contactInfo: joinForm.contactInfo,
        portfolioUrl: joinForm.portfolioUrl,
        skills: joinForm.skills,
        preferredRole: joinForm.preferredRole,
        availability: joinForm.availability,
        motivation: joinForm.motivation,
        agreedToGuidelines: joinForm.agreed,
      }
      const res = await fetch('/api/projects/join', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((json as Record<string, unknown>)?.error as string || 'Failed to submit application')
        return
      }
      toast.success('Application submitted')
      // refresh projects so creator sees new member and this user sees joined projects
      fetchProjects()
      // optionally add to myProjects locally
      setMyProjects((s) => [ { ...joinProject, collaborators: [...joinProject.collaborators, { id: user?.id || 'me', name: joinForm.fullName || (user?.fullName || 'You') }] }, ...s ])
      setJoinOpen(false)
      setJoinProject(null)
    } catch (err) {
      console.error('Join failed', err)
      toast.error('Failed to submit application')
    } finally {
      setJoining(false)
    }
  }

  // Manage project modal (for creators to view applicants)
  const [manageProject, setManageProject] = useState<Project | null>(null)
  const [manageOpen, setManageOpen] = useState<boolean>(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Applicant profile & approval flow
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [applicantOpen, setApplicantOpen] = useState<boolean>(false)
  const [processingApplicantId, setProcessingApplicantId] = useState<string | null>(null)

  function openApplicantProfile(c: Applicant) {
    setSelectedApplicant(c)
    setApplicantOpen(true)
  }

  async function respondToApplicant(memberId: string, action: 'accept' | 'reject') {
    if (!manageProject) return
    try {
      setProcessingApplicantId(memberId)
      const res = await fetch(`/api/projects/member?projectId=${encodeURIComponent(manageProject.id)}&userId=${encodeURIComponent(memberId)}&action=${action}`, { method: 'PATCH', credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((json as Record<string, unknown>)?.error as string || 'Failed to update application')
        return
      }
      toast.success(action === 'accept' ? 'Applicant accepted' : 'Applicant rejected')
      // refresh projects and update local manageProject
      fetchProjects()
      setManageProject((s) => {
        if (!s) return s
        return {
          ...s,
          collaborators: s.collaborators.map((c) => (c.id === memberId ? { ...c, application: { ...(c.application || {}), status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' } } : c)),
        }
      })
      setApplicantOpen(false)
      setSelectedApplicant(null)
    } catch (err) {
      console.error('Respond to applicant failed', err)
      toast.error('Failed to update application')
    } finally {
      setProcessingApplicantId(null)
    }
  }

  function openManageProject(p: Project) {
    setManageProject(p)
    setManageOpen(true)
  }

  async function removeMember(projectId: string, memberId: string) {
    try {
      setRemovingMemberId(memberId)
      const res = await fetch('/api/projects/member', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, userId: memberId }), credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'Failed to remove member')
        return
      }
      toast.success('Member removed')
      // refresh projects
      fetchProjects()
      // update local manageProject state
      setManageProject((s) => s ? { ...s, collaborators: s.collaborators.filter((c) => c.id !== memberId) } : s)
    } catch (err) {
      console.error('Remove member failed', err)
      toast.error('Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
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
                <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-gray-200">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="p-2 bg-transparent text-sm rounded-full border-none outline-none"
                    aria-label="Filter by category"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="p-2 bg-transparent text-sm rounded-full border-none outline-none"
                    aria-label="Filter by difficulty"
                  >
                    {difficulties.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="p-2 bg-transparent text-sm rounded-full border-none outline-none"
                    aria-label="Filter by status"
                  >
                    <option value="All">All</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    placeholder="Max wk"
                    value={maxDuration ?? ""}
                    onChange={(e) => setMaxDuration(e.target.value ? Number(e.target.value) : null)}
                    className="w-20 p-2 bg-transparent text-sm rounded-full border-none outline-none"
                    aria-label="Max duration weeks"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { setQuery(''); setCategory('All'); setDifficulty('All'); setStatus('All'); setMaxDuration(null); }}
                  className="text-sm text-gray-600 px-3 py-2"
                  aria-label="Clear filters"
                >
                  Clear
                </button>
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

                <div className="flex justify-end">
                  <button type="button" onClick={() => { setQuery(''); setCategory('All'); setDifficulty('All'); setStatus('All'); setMaxDuration(null); setShowFilters(false); }} className="text-sm text-gray-600">Clear</button>
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
            {loadingProjects ? (
              <div className="col-span-full flex flex-col items-center justify-center py-8 sm:py-12 w-full">
                <svg aria-hidden="true" className="w-8 h-8 text-green-600 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <div className="mt-3 text-sm text-gray-600">Loading projects…</div>

                <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border-2 border-black bg-white overflow-hidden min-h-[18rem]">
                      <div className="w-full h-48 bg-gray-100" />
                      <div className="p-4">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
                        <div className="h-3 bg-gray-200 rounded w-5/6 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              filtered.map((p) => (
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
              ))
            )}
          </div>
        </section>

        {/* My Projects */}
        <section className="mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Link href="/projects/create">
                <Button variant="outline" className="border-green-600 text-green-700">Start Your Own Project</Button>
              </Link>
            </div>
          </div>

          <div className="mt-4">
            {myProjects.length === 0 ? (
              <div className="py-8 text-center text-gray-600">You haven&apos;t joined any projects yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                {myProjects.map((m) => (
                  <div key={m.id} className="rounded-lg border-2 border-black p-4 bg-white flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                      <div className="text-xs text-gray-600">Role: Collaborator • Progress: 25%</div>
                    </div>
                    <div>
                      <Button variant="secondary" className="bg-green-600 text-white transform transition-transform duration-150 ease-out hover:-translate-y-1 hover:scale-105 active:scale-100 hover:bg-green-600 hover:text-white">Continue Collaboration</Button>
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
                <div className="py-6 text-center text-gray-600">You haven&apos;t created any projects yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ownedProjects.map((op) => (
                    <div key={op.id} className="rounded-md border-2 border-black p-3 bg-white flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{op.title}</h3>
                        <div className="text-xs text-gray-600">{op.requiredSkills?.slice(0,3).join(', ')}{op.requiredSkills && op.requiredSkills.length > 3 ? '…' : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" className="text-sm border border-gray-200 px-3 py-1 rounded-md" onClick={() => openManageProject(op)}>View</Button>
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

      {/* Join application modal */}
      <Dialog open={joinOpen} onOpenChange={(o) => setJoinOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to join</DialogTitle>
            <DialogDescription>{joinProject?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Full name</label>
              <input value={joinForm.fullName} onChange={(e) => setJoinForm((s) => ({ ...s, fullName: e.target.value }))} className="w-full mt-1 p-2 border border-gray-200 rounded-md" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email / Contact</label>
              <input value={joinForm.contactInfo} onChange={(e) => setJoinForm((s) => ({ ...s, contactInfo: e.target.value }))} className="w-full mt-1 p-2 border border-gray-200 rounded-md" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Portfolio / GitHub / LinkedIn</label>
              <input value={joinForm.portfolioUrl} onChange={(e) => setJoinForm((s) => ({ ...s, portfolioUrl: e.target.value }))} className="w-full mt-1 p-2 border border-gray-200 rounded-md" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Skills you bring (comma separated)</label>
              <input value={joinForm.skills} onChange={(e) => setJoinForm((s) => ({ ...s, skills: e.target.value }))} className="w-full mt-1 p-2 border border-gray-200 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Preferred role</label>
                <select value={joinForm.preferredRole} onChange={(e) => setJoinForm((s) => ({ ...s, preferredRole: e.target.value }))} className="w-full mt-1 p-2 border border-gray-200 rounded-md">
                  <option>Frontend</option>
                  <option>Backend</option>
                  <option>Designer</option>
                  <option>Researcher</option>
                  <option>Fullstack</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Availability</label>
                <input value={joinForm.availability} onChange={(e) => setJoinForm((s) => ({ ...s, availability: e.target.value }))} placeholder="e.g., 8 hrs/week" className="w-full mt-1 p-2 border border-gray-200 rounded-md" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Motivation / Why you want to join</label>
              <textarea value={joinForm.motivation} onChange={(e) => setJoinForm((s) => ({ ...s, motivation: e.target.value }))} className="w-full mt-1 p-2 border border-gray-200 rounded-md" rows={4} />
            </div>
            <div className="flex items-center gap-2">
              <input id="agree" type="checkbox" checked={joinForm.agreed} onChange={(e) => setJoinForm((s) => ({ ...s, agreed: e.target.checked }))} />
              <label htmlFor="agree" className="text-sm text-gray-700">I agree to the project guidelines</label>
            </div>

            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => submitJoinApplication()} disabled={joining} className="bg-green-600 text-white">{joining ? 'Applying…' : 'Apply'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage project modal - visible to project creators */}
      <Dialog open={manageOpen} onOpenChange={(o) => setManageOpen(o)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage project</DialogTitle>
            <DialogDescription>{manageProject?.title}</DialogDescription>
          </DialogHeader>

          {manageProject ? (
            <div className="grid gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Applicants / Members</h4>
                <div className="mt-3 space-y-3">
                  {manageProject.collaborators.length === 0 ? (
                    <div className="text-sm text-gray-600">No applicants yet.</div>
                  ) : (
                    manageProject.collaborators.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 justify-between border border-gray-100 rounded-md p-3">
                         <div className="flex items-start gap-3">
                          {c.avatar ? (
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={c.avatar} alt={c.name} />
                              <AvatarFallback>{c.name?.[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600">{c.name?.[0] ?? 'U'}</div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{c.application?.fullName || c.name}</div>
                            <div className="text-xs text-gray-600">{c.application?.preferredRole || c.role || 'Contributor'} • {c.application?.availability || ''}</div>
                            <div className="mt-1 text-xs text-gray-700">{c.application?.motivation ? (c.application.motivation.length > 200 ? c.application.motivation.slice(0,200) + '…' : c.application.motivation) : ''}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              {c.application?.contactInfo && (<a href={`mailto:${c.application.contactInfo}`} className="text-green-700 underline">Contact</a>)}
                              {c.application?.portfolioUrl && (<a href={c.application.portfolioUrl} target="_blank" rel="noreferrer" className="text-green-700 underline">Portfolio</a>)}
                              {c.application?.skills && c.application.skills.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {c.application.skills.slice(0,4).map((s) => (<Badge key={s} className="bg-green-50 text-green-700 border-green-100 text-xs px-2 py-0.5 rounded">{s}</Badge>))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-gray-600">Joined at: {/* show joinedAt if needed */}</div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${c.application?.contactInfo || ''}`}>Message</a>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openApplicantProfile(c)}>View Profile</Button>
                            <Button className="text-sm border border-red-600 text-red-600 bg-white px-3 py-1 rounded-md" onClick={() => removeMember(manageProject.id, c.id)} disabled={removingMemberId === c.id}>
                              {removingMemberId === c.id ? 'Removing…' : 'Remove'}
                            </Button>
                          </div>
                        </div>
                      </div>
                     ))
                   )}
                 </div>
               </div>

               <div className="flex justify-end">
                 <DialogClose asChild>
                   <Button variant="outline">Close</Button>
                 </DialogClose>
               </div>
             </div>
           ) : (
             <div className="py-6 text-center text-sm text-gray-600">Loading…</div>
           )}
         </DialogContent>
       </Dialog>

      {/* Applicant profile modal - shows full application and accept/reject actions for owner */}
      <Dialog open={applicantOpen} onOpenChange={(o) => setApplicantOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Applicant profile</DialogTitle>
            <DialogDescription>{selectedApplicant?.application?.fullName || selectedApplicant?.name}</DialogDescription>
          </DialogHeader>
          {selectedApplicant ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                {selectedApplicant.avatar ? (
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={selectedApplicant.avatar} alt={selectedApplicant.name} />
                    <AvatarFallback>{selectedApplicant.name?.[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600">{selectedApplicant.name?.[0] ?? 'U'}</div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">{selectedApplicant.application?.fullName || selectedApplicant.name}</div>
                  <div className="text-xs text-gray-600">{selectedApplicant.application?.preferredRole || selectedApplicant.role || ''}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Contact</h4>
                <div className="mt-1 text-sm text-gray-700">{selectedApplicant.application?.contactInfo || 'Not provided'}</div>
                {selectedApplicant.application?.portfolioUrl && (<a href={selectedApplicant.application.portfolioUrl} target="_blank" rel="noreferrer" className="text-green-700 underline text-sm mt-1 block">View portfolio</a>)}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Skills</h4>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {(selectedApplicant.application?.skills || []).length === 0 ? (
                    <div className="text-sm text-gray-600">Not specified</div>
                  ) : (
                    (selectedApplicant.application?.skills || []).map((s: string) => <Badge key={s} className="bg-green-50 text-green-700 border-green-100 text-xs px-2 py-0.5 rounded">{s}</Badge>)
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Motivation</h4>
                <div className="mt-1 text-sm text-gray-700">{selectedApplicant.application?.motivation || '—'}</div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button className="bg-green-600 text-white" onClick={() => { if (selectedApplicant?.id) respondToApplicant(selectedApplicant.id, 'accept') }} disabled={processingApplicantId === selectedApplicant?.id}>{processingApplicantId === selectedApplicant?.id ? 'Processing…' : 'Accept'}</Button>
                <Button className="text-sm border border-gray-300 text-gray-800 bg-white px-3 py-1 rounded-md" onClick={() => { if (selectedApplicant?.id) respondToApplicant(selectedApplicant.id, 'reject') }} disabled={processingApplicantId === selectedApplicant?.id}>{processingApplicantId === selectedApplicant?.id ? 'Processing…' : 'Reject'}</Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-600">Loading…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
