/* eslint-disable @next/next/no-img-element */
"use client"

/**
 * Dashboard Page
 * Single-file implementation using shadcn/ui with a minimal, modern, light theme.
 * Sections:
 *  - Top Navigation (with Clerk SignedIn/SignedOut -> UserButton / SignInButton)
 *  - Header/Profile Section
 *  - Quick Actions
 *  - Skills (Learned / Taught) with Add Skill Dialog
 *  - Projects (table view) with filters and status management
 *  - Portfolio Cards
 *  - Stats & Achievements with a small activity chart
 *  - Footer with basic links
 *
 * Design:
 *  - Light mode, green + white primary (via tokens: bg-primary, text-primary-foreground, etc.)
 *  - Rounded corners, soft shadows, whitespace, sans-serif
 *  - Responsive layout using flex and grid per guidelines
 *
 * Note:
 *  - All code is contained in this single file per the instructions.
 */

import * as React from "react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import {
  Github,
  Linkedin,
  Globe,
  Plus,
  CheckCircle2,
  Star,
  Users,
  BookOpen,
  GraduationCap,
  Briefcase,
  MoreHorizontal,
  PencilLine,
  Trash2,
  FolderOpen,
  Rocket,
  ListTodo,
  LineChart,
  CheckSquare,
  Search,
  Award,
  ShieldCheck,
  Leaf,
  Calendar,
  UploadCloud,
  ExternalLink,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Types
type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert"
type Skill = {
  id: string
  name: string
  level: SkillLevel
  category: "Frontend" | "Backend" | "DevOps" | "Design" | "Data" | "Other"
  type: "learned" | "taught"
}

type ProjectStatus = "Ongoing" | "Completed" | "Paused"
type ProjectRole = "Leader" | "Member"

type Project = {
  id: string
  name: string
  description: string
  role: ProjectRole
  status: ProjectStatus
  participants: number
  updatedAt: string
  tags: string[]
}

type Stat = {
  label: string
  value: number
  icon: React.ElementType
}

type PortfolioLink = {
  id: string
  title: string
  description?: string
  url: string
  icon: React.ElementType
  kind: "Resume" | "GitHub" | "Certificates" | "Portfolio"
}

// Utilities
const uid = () => Math.random().toString(36).slice(2, 9)

// Mock Initial Data
const initialLearnedSkills: Skill[] = [
  { id: uid(), name: "React", level: "Advanced", category: "Frontend", type: "learned" },
  { id: uid(), name: "TypeScript", level: "Advanced", category: "Frontend", type: "learned" },
  { id: uid(), name: "Node.js", level: "Intermediate", category: "Backend", type: "learned" },
  { id: uid(), name: "UI/UX", level: "Intermediate", category: "Design", type: "learned" },
  { id: uid(), name: "Git & GitHub", level: "Advanced", category: "Other", type: "learned" },
  { id: uid(), name: "Next.js", level: "Advanced", category: "Frontend", type: "learned" },
]

const initialTaughtSkills: Skill[] = [
  { id: uid(), name: "JavaScript Basics", level: "Advanced", category: "Frontend", type: "taught" },
  { id: uid(), name: "CSS Layouts", level: "Intermediate", category: "Frontend", type: "taught" },
]

const initialProjects: Project[] = [
  {
    id: uid(),
    name: "Campus Collab Portal",
    description: "A cross-institution project portal enabling student teams to publish and join real-world projects.",
    role: "Leader",
    status: "Ongoing",
    participants: 12,
    updatedAt: "2025-09-22",
    tags: ["Next.js", "Postgres", "Clerk"],
  },
  {
    id: uid(),
    name: "Skill Builder Modules",
    description: "Micro-learning modules for React and UI design with interactive assessments.",
    role: "Member",
    status: "Completed",
    participants: 7,
    updatedAt: "2025-09-10",
    tags: ["React", "UI/UX", "Vercel"],
  },
  {
    id: uid(),
    name: "Data Viz Sprint",
    description: "Short sprint to build accessible visualizations for community data sets.",
    role: "Member",
    status: "Paused",
    participants: 5,
    updatedAt: "2025-08-30",
    tags: ["D3", "Accessibility", "Design"],
  },
  {
    id: uid(),
    name: "Mentorship Match",
    description: "Prototype for matching mentors and mentees across institutions based on interests.",
    role: "Leader",
    status: "Ongoing",
    participants: 9,
    updatedAt: "2025-09-12",
    tags: ["TypeScript", "Edge", "AI"],
  },
]

const initialStats: Stat[] = [
  { label: "Skills Completed", value: 18, icon: CheckSquare },
  { label: "Projects Joined", value: 9, icon: Users },
  { label: "Learners Impacted", value: 126, icon: GraduationCap },
]

const initialPortfolio: PortfolioLink[] = [
  {
    id: uid(),
    title: "Resume (PDF)",
    description: "Latest one-page resume with projects and achievements.",
    url: "#",
    icon: UploadCloud,
    kind: "Resume",
  },
  {
    id: uid(),
    title: "GitHub Repositories",
    description: "Code, contributions, open-source work, and experiments.",
    url: "https://github.com/",
    icon: Github,
    kind: "GitHub",
  },
  {
    id: uid(),
    title: "Certificates",
    description: "Browse verified skill certificates and badges.",
    url: "#",
    icon: Award,
    kind: "Certificates",
  },
  {
    id: uid(),
    title: "Portfolio",
    description: "Designs, case studies, and demos.",
    url: "#",
    icon: Globe,
    kind: "Portfolio",
  },
]

// Activity data for chart (simple weekly activity)
const activityData = [
  { week: "W1", skills: 2, projects: 1 },
  { week: "W2", skills: 1, projects: 2 },
  { week: "W3", skills: 3, projects: 1 },
  { week: "W4", skills: 2, projects: 3 },
]

// Navbar component (internal to this file)
function TopNav() {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/leaf-logo.jpg" alt="" className="h-7 w-7" />
            <Link href="/" className="font-semibold tracking-tight text-pretty">
              SkillCollab
            </Link>
            <Badge variant="secondary" className="ml-2 rounded-full">
              <Leaf className="h-3.5 w-3.5 mr-1" />
              Beta
            </Badge>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/dashboard#skills">Skills</NavLink>
            <NavLink href="/dashboard#projects">Projects</NavLink>
            <NavLink href="/about">About</NavLink>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex">
              <SearchBox />
            </div>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default" className="rounded-full">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: { userButtonBox: "rounded-full" },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </nav>
    </header>
  )
}

function NavLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Link href={props.href} className="text-muted-foreground hover:text-foreground transition-colors">
      {props.children}
    </Link>
  )
}

function SearchBox() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input className="pl-9 w-56 rounded-full" placeholder="Search..." aria-label="Search" />
    </div>
  )
}

function ProfileHeader() {
  const { user } = useUser()

  const name = user?.fullName || "Guest User"
  const email = user?.primaryEmailAddress?.emailAddress || "guest@example.com"

  return (
    <section aria-label="Profile header" className="container mx-auto px-4 pt-8">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="/placeholder-user.jpg" alt={name} />
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-balance">{name}</h1>
                <p className="text-sm text-muted-foreground text-pretty">
                  Building skills and collaborating on real-world projects across institutions.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary" className="rounded-full">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                    Verified
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Joined 2024
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild className="rounded-full bg-transparent">
                      <Link href="https://github.com" target="_blank" rel="noreferrer">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open GitHub</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="outline" asChild className="rounded-full bg-transparent">
                <Link href="https://linkedin.com" target="_blank" rel="noreferrer">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Link>
              </Button>

              <Button variant="outline" asChild className="rounded-full bg-transparent">
                <Link href="#" target="_blank" rel="noreferrer">
                  <Globe className="h-4 w-4 mr-2" />
                  Portfolio
                </Link>
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Primary email</p>
              <p className="text-sm font-medium">{email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="default" className="rounded-full">
                <Rocket className="h-4 w-4 mr-2" />
                Continue Learning
              </Button>
              <Button variant="secondary" className="rounded-full" asChild>
                <Link href="#projects">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  View Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function QuickActions() {
  return (
    <section aria-label="Quick actions" className="container mx-auto px-4 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Continue Learning
            </CardTitle>
            <CardDescription>Pick up where you left off.</CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button variant="default" className="rounded-full">
              Resume
            </Button>
          </CardFooter>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <ListTodo className="h-4 w-4 mr-2" />
              Create Skill Module
            </CardTitle>
            <CardDescription>Design a new learning module.</CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button variant="default" className="rounded-full">
              Create
            </Button>
          </CardFooter>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Join a Project
            </CardTitle>
            <CardDescription>Explore collaboration opportunities.</CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Button variant="default" className="rounded-full">
              Browse
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

function SkillsSection() {
  const [learned, setLearned] = useState<Skill[]>(initialLearnedSkills)
  const [taught, setTaught] = useState<Skill[]>(initialTaughtSkills)

  // Dialog state
  const [open, setOpen] = useState(false)
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>("Beginner")
  const [newSkillCategory, setNewSkillCategory] = useState<Skill["category"]>("Frontend")
  const [newSkillType, setNewSkillType] = useState<Skill["type"]>("learned")

  const totalSkills = learned.length + taught.length

  function addSkill() {
    const trimmed = newSkillName.trim()
    if (!trimmed) return
    const skill: Skill = {
      id: uid(),
      name: trimmed,
      level: newSkillLevel,
      category: newSkillCategory,
      type: newSkillType,
    }
    if (newSkillType === "learned") setLearned((s) => [skill, ...s])
    else setTaught((s) => [skill, ...s])

    // Reset form
    setNewSkillName("")
    setNewSkillLevel("Beginner")
    setNewSkillCategory("Frontend")
    setNewSkillType("learned")
    setOpen(false)
  }

  const levelColor = (level: SkillLevel) => {
    switch (level) {
      case "Beginner":
        return "bg-secondary text-secondary-foreground"
      case "Intermediate":
        return "bg-muted"
      case "Advanced":
        return "bg-primary text-primary-foreground"
      case "Expert":
        return "bg-primary text-primary-foreground"
      default:
        return "bg-muted"
    }
  }

  return (
    <section id="skills" aria-label="Skills" className="container mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add a new skill</DialogTitle>
              <DialogDescription>Add a learned or taught skill with level and category.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g., React, Figma, Docker"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Level</label>
                  <Select value={newSkillLevel} onValueChange={(v: SkillLevel) => setNewSkillLevel(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newSkillCategory} onValueChange={(v: Skill["category"]) => setNewSkillCategory(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Frontend">Frontend</SelectItem>
                      <SelectItem value="Backend">Backend</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Data">Data</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newSkillType} onValueChange={(v: Skill["type"]) => setNewSkillType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="learned">Learned</SelectItem>
                      <SelectItem value="taught">Taught</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="rounded-full bg-transparent">
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={addSkill} className="rounded-full">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Learned Skills
            </CardTitle>
            <CardDescription>Showcase of your acquired skills and proficiency.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {learned.map((s) => (
                <Badge key={s.id} variant="outline" className="px-3 py-1 rounded-full">
                  <span className="mr-2">{s.name}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", levelColor(s.level))}>{s.level}</span>
                </Badge>
              ))}
              {learned.length === 0 && <p className="text-sm text-muted-foreground">No learned skills yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Taught Skills
            </CardTitle>
            <CardDescription>Skills you’ve mentored or taught.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {taught.map((s) => (
                <Badge key={s.id} variant="outline" className="px-3 py-1 rounded-full">
                  <span className="mr-2">{s.name}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", levelColor(s.level))}>{s.level}</span>
                </Badge>
              ))}
              {taught.length === 0 && <p className="text-sm text-muted-foreground">No taught skills yet.</p>}
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="text-sm text-muted-foreground">
              Total skills: <span className="font-medium text-foreground">{totalSkills}</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All")
  const [roleFilter, setRoleFilter] = useState<ProjectRole | "All">("All")
  const [openDialog, setOpenDialog] = useState(false)

  // New project dialog state
  const [pName, setPName] = useState("")
  const [pDesc, setPDesc] = useState("")
  const [pRole, setPRole] = useState<ProjectRole>("Member")
  const [pStatus, setPStatus] = useState<ProjectStatus>("Ongoing")
  const [pTags, setPTags] = useState<string>("Next.js, Teamwork")

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.join(",").toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === "All" ? true : p.status === statusFilter
      const matchesRole = roleFilter === "All" ? true : p.role === roleFilter
      return matchesQuery && matchesStatus && matchesRole
    })
  }, [projects, query, statusFilter, roleFilter])

  function addProject() {
    const name = pName.trim()
    const desc = pDesc.trim()
    if (!name || !desc) return
    const tags = pTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const newP: Project = {
      id: uid(),
      name,
      description: desc,
      role: pRole,
      status: pStatus,
      participants: Math.floor(Math.random() * 10) + 3,
      updatedAt: new Date().toISOString().slice(0, 10),
      tags,
    }
    setProjects((prev) => [newP, ...prev])
    // reset
    setPName("")
    setPDesc("")
    setPTags("Next.js, Teamwork")
    setPRole("Member")
    setPStatus("Ongoing")
    setOpenDialog(false)
  }

  function setStatus(id: string, status: ProjectStatus) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  function removeProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <section id="projects" aria-label="Projects" className="container mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 rounded-full w-56"
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={(v: ProjectStatus | "All") => setStatusFilter(v)}>
            <SelectTrigger className="w-[130px] rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Ongoing">Ongoing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Paused">Paused</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={(v: ProjectRole | "All") => setRoleFilter(v)}>
            <SelectTrigger className="w-[130px] rounded-full">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Leader">Leader</SelectItem>
              <SelectItem value="Member">Member</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button variant="default" className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Create a new project</DialogTitle>
                <DialogDescription>Define the basic details and status for your project.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="e.g., Open Campus Hub"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tags (comma separated)</label>
                    <Input placeholder="e.g., React, Data" value={pTags} onChange={(e) => setPTags(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Short description of the project goal..."
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={pRole} onValueChange={(v: ProjectRole) => setPRole(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Leader">Leader</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={pStatus} onValueChange={(v: ProjectStatus) => setPStatus(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-full bg-transparent">
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={addProject} className="rounded-full">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Project</TableHead>
              <TableHead className="w-[26%]">Description</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead className="hidden md:table-cell">Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="align-top">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md border bg-muted/40 flex items-center justify-center">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium leading-tight">{p.name}</div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.tags.map((t, i) => (
                          <Badge key={i} variant="secondary" className="rounded-full">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={p.role === "Leader" ? "default" : "outline"} className="rounded-full">
                    {p.role}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    className="rounded-full"
                    variant={p.status === "Completed" ? "secondary" : p.status === "Ongoing" ? "default" : "outline"}
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">{p.participants}</TableCell>
                <TableCell className="align-top hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">{p.updatedAt}</span>
                </TableCell>
                <TableCell className="align-top text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setStatus(p.id, "Ongoing")}>Mark Ongoing</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus(p.id, "Completed")}>Mark Completed</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus(p.id, "Paused")}>Mark Paused</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <PencilLine className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => removeProject(p.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                        <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No projects found for the selected filters.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}

function PortfolioSection() {
  const items = initialPortfolio

  return (
    <section aria-label="Portfolio" className="container mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Portfolio</h2>
        <Button variant="secondary" className="rounded-full" asChild>
          <Link href="#">
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Links
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="border shadow-sm hover:shadow transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <item.icon className="h-4 w-4 mr-2" />
                {item.title}
              </CardTitle>
              {!!item.description && <CardDescription className="line-clamp-2">{item.description}</CardDescription>}
            </CardHeader>
            <CardFooter className="pt-0">
              <Button asChild variant="default" className="rounded-full">
                <Link href={item.url} target="_blank" rel="noreferrer">
                  Open
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}

function StatsAchievementsSection() {
  const stats = initialStats

  // Fake completion progress calculation
  const completion = useMemo(() => {
    const total = 100
    const base = Math.min(100, Math.round((stats[0].value / 25) * 100))
    return Math.min(total, base)
  }, [stats])

  return (
    <section aria-label="Stats and Achievements" className="container mx-auto px-4 pt-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </CardTitle>
            <CardDescription>Skills and projects activity over the last 4 weeks.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer
              className="h-[200px]"
              config={{
                skills: { label: "Skills", color: "hsl(var(--chart-1))" },
                projects: { label: "Projects", color: "hsl(var(--chart-2))" },
              }}
            >
              {/* Using Recharts per shadcn/ui chart helper */}
              {/* We avoid bringing full chart code here; ChartTooltip handles consistent tooltip styles */}
              {/* The line/bar components rely on --color-skills and --color-projects */}
              {/* The ChartContainer provides context variables for theme colors */}
              {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
              {React.createElement(require("recharts").ResponsiveContainer, { width: "100%", height: "100%" }, [
                React.createElement(
                  require("recharts").ComposedChart,
                  { key: "chart", data: activityData, margin: { top: 10, right: 10, left: 0, bottom: 0 } },
                  [
                    React.createElement(require("recharts").CartesianGrid, { key: "grid", strokeDasharray: "3 3" }),
                    React.createElement(require("recharts").XAxis, { key: "x", dataKey: "week" }),
                    React.createElement(require("recharts").YAxis, { key: "y" }),
                    React.createElement(ChartTooltip as any, {
                      key: "tt",
                      content: React.createElement(ChartTooltipContent),
                    }),
                    React.createElement(require("recharts").Bar, {
                      key: "bar",
                      dataKey: "skills",
                      fill: "var(--color-skills)",
                      radius: [4, 4, 0, 0],
                    }),
                    React.createElement(require("recharts").Line, {
                      key: "line",
                      type: "monotone",
                      dataKey: "projects",
                      stroke: "var(--color-projects)",
                      strokeWidth: 2,
                    }),
                  ],
                ),
              ])}
            </ChartContainer>
          </CardContent>
          <CardFooter className="pt-2">
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-medium">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </CardFooter>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Stats
            </CardTitle>
            <CardDescription>Your progress at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                    <div className="text-base font-semibold">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <p className="text-sm text-muted-foreground">Keep learning and collaborating to increase your impact.</p>
          </CardFooter>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Achievements
            </CardTitle>
            <CardDescription>Milestones you’ve unlocked.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="rounded-full">
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                Skill Master
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                <Users className="h-3.5 w-3.5 mr-1" />
                Mentor
              </Badge>
              <Badge variant="outline" className="rounded-full">
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Leader
              </Badge>
              <Badge variant="outline" className="rounded-full">
                <Leaf className="h-3.5 w-3.5 mr-1" />
                Sustainability
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="secondary" className="rounded-full">
              View all
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mt-12 border-t">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <img src="/leaf-logo.jpg" alt="" className="h-6 w-6" />
            <span className="text-muted-foreground">© {new Date().getFullYear()} SkillCollab</span>
          </div>
          <div className="flex items-center gap-4">
            <Link className="text-muted-foreground hover:text-foreground" href="/about">
              About
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/contact">
              Contact
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/privacy">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Page
export default function DashboardPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNav />
      <main className="pb-10">
        <ProfileHeader />
        <QuickActions />
        <SkillsSection />
        <ProjectsSection />
        <PortfolioSection />
        <StatsAchievementsSection />
      </main>
      <Footer />
    </div>
  )
}
