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
import { useMemo, useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import Image from "next/image";
import Navbar from "@/components/Navbar";
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
  Loader2,
} from "lucide-react"

import { io } from "socket.io-client";

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
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, Line } from "recharts";
import { toast } from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Import the new SkillFormDialog component
import { SkillFormDialog } from "@/components/SkillFormDialog";

// Types
type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert"
type SkillCategory = "Frontend" | "Backend" | "DevOps" | "Design" | "Data" | "Other"
type Skill = {
  id: string
  name: string
  level: SkillLevel
  category: SkillCategory
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _initialLearnedSkills: Skill[] = [
  { id: uid(), name: "React", level: "Advanced", category: "Frontend", type: "learned" },
  { id: uid(), name: "TypeScript", level: "Advanced", category: "Frontend", type: "learned" },
  { id: uid(), name: "Node.js", level: "Intermediate", category: "Backend", type: "learned" },
  { id: uid(), name: "UI/UX", level: "Intermediate", category: "Design", type: "learned" },
  { id: uid(), name: "Git & GitHub", level: "Advanced", category: "Other", type: "learned" },
  { id: uid(), name: "Next.js", level: "Advanced", category: "Frontend", type: "learned" },
]
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _initialTaughtSkills: Skill[] = [
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

// Activity data for chart (simple weekly activity)
const activityData = [
  { week: "W1", skills: 2, projects: 1 },
  { week: "W2", skills: 1, projects: 2 },
  { week: "W3", skills: 3, projects: 1 },
  { week: "W4", skills: 2, projects: 3 },
]

// Navbar component (internal to this file)
function ProfileHeader() {
  const { user } = useUser()

  const name = user?.fullName || "Guest User"
  const email = user?.primaryEmailAddress?.emailAddress || "guest@example.com"

  const [githubUrl, setGithubUrl] = useState(user?.publicMetadata?.githubUrl as string || "");
  const [linkedinUrl, setLinkedinUrl] = useState(user?.publicMetadata?.linkedinUrl as string || "");
  const [portfolioUrl, setPortfolioUrl] = useState(user?.publicMetadata?.portfolioUrl as string || "");

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editingGithubUrl, setEditingGithubUrl] = useState(githubUrl);
  const [editingLinkedinUrl, setEditingLinkedinUrl] = useState(linkedinUrl);
  const [editingPortfolioUrl, setEditingPortfolioUrl] = useState(portfolioUrl);
  const [showProfileInLearn, setShowProfileInLearn] = useState(true);

  useEffect(() => {
    if (user) {
      setGithubUrl(user.publicMetadata?.githubUrl as string || "");
      setLinkedinUrl(user.publicMetadata?.linkedinUrl as string || "");
      setPortfolioUrl(user.publicMetadata?.portfolioUrl as string || "");
      
      // Fetch the showProfileInLearn status
      const fetchProfileVisibility = async () => {
        try {
          const response = await fetch('/api/update-profile-visibility'); // Use new API to fetch initial state
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (typeof data.showProfileInLearn === 'boolean') {
            setShowProfileInLearn(data.showProfileInLearn);
          }
        } catch (error) {
          console.error("Error fetching profile visibility:", error);
        }
      };
      fetchProfileVisibility();

      setEditingGithubUrl(user.publicMetadata?.githubUrl as string || "");
      setEditingLinkedinUrl(user.publicMetadata?.linkedinUrl as string || "");
      setEditingPortfolioUrl(user.publicMetadata?.portfolioUrl as string || "");
    }
  }, [user]);
  
  useEffect(() => {
    if (user && user.id) {
      console.log("User authenticated, attempting to save data:", user);
      // Call the save-user API route when the user is authenticated
      const saveUser = async () => {
        try {
          const response = await fetch("/api/save-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              githubUrl: user.publicMetadata?.githubUrl || "",
              linkedinUrl: user.publicMetadata?.linkedinUrl || "",
              portfolioUrl: user.publicMetadata?.portfolioUrl || "",
              // Do not send showProfileInLearn here to avoid overwriting on initial save
            }),
          });
  
          if (!response.ok) {
            const errorData = await response.json();
            console.error("API response error:", errorData);
            // Suppress the error from being thrown to avoid console errors on successful update scenarios
            // For further debugging, consider adding specific status code handling here.
            return; // Exit the function gracefully
          }
          console.log("User data saved on authentication successfully.");
        } catch (error) {
          console.error("Error saving user data on authentication:", error);
        }
      };
      saveUser();
    }
  }, [user]);
  
  async function handleSaveProfile() {
    if (!user) {
      toast.error("You need to be logged in to save your profile.");
      return;
    }
    try {
      // Optimistically update the local state first
      setGithubUrl(editingGithubUrl);
      setLinkedinUrl(editingLinkedinUrl);
      setPortfolioUrl(editingPortfolioUrl);

      const response = await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: editingGithubUrl,
          linkedinUrl: editingLinkedinUrl,
          portfolioUrl: editingPortfolioUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save profile.");
      }

      setIsProfileDialogOpen(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert local state on error
      setEditingGithubUrl(githubUrl);
      setEditingLinkedinUrl(linkedinUrl);
      setEditingPortfolioUrl(portfolioUrl);
    }
  }

  async function handleToggleProfileVisibility(checked: boolean) {
    if (!user) {
      toast.error("You need to be logged in to change profile visibility.");
      return;
    }
    try {
      setShowProfileInLearn(checked); // Optimistic update

      const response = await fetch("/api/update-profile-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showProfile: checked }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile visibility.");
      }

      toast.success(checked ? "Profile is now visible on Learn page." : "Profile is now hidden from Learn page.");
    } catch (error) {
      console.error("Failed to update profile visibility:", error);
      toast.error(`Failed to update profile visibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowProfileInLearn(!checked); // Revert on error
    }
  }

  return (
    <section aria-label="Profile header" className="container mx-auto px-4 pt-8">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {user?.imageUrl ? (
                  <AvatarImage src={user.imageUrl} alt={name} />
                ) : (
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                )}
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

            <div className="flex flex-col items-end gap-3 md:items-center md:flex-row">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild className="rounded-full bg-transparent" aria-disabled={!githubUrl}>
                      <Link href={githubUrl || "#"} target="_blank" rel="noreferrer" tabIndex={githubUrl ? undefined : -1}>
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open GitHub</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild className="rounded-full bg-transparent" aria-disabled={!linkedinUrl}>
                      <Link href={linkedinUrl || "#"} target="_blank" rel="noreferrer" tabIndex={linkedinUrl ? undefined : -1}>
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open LinkedIn</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild className="rounded-full bg-transparent" aria-disabled={!portfolioUrl}>
                      <Link href={portfolioUrl || "#"} target="_blank" rel="noreferrer" tabIndex={portfolioUrl ? undefined : -1}>
                        <Globe className="h-4 w-4 mr-2" />
                        Portfolio
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open Portfolio</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="rounded-full">
                    <PencilLine className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Edit Profile Links</DialogTitle>
                    <DialogDescription>Update your social URLs.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div>
                      <label htmlFor="github-url" className="text-sm font-medium">GitHub URL</label>
                      <Input id="github-url" placeholder="https://github.com/yourusername" value={editingGithubUrl} onChange={(e) => setEditingGithubUrl(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="linkedin-url" className="text-sm font-medium">LinkedIn URL</label>
                      <Input id="linkedin-url" placeholder="https://linkedin.com/in/yourprofile" value={editingLinkedinUrl} onChange={(e) => setEditingLinkedinUrl(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="portfolio-url" className="text-sm font-medium">Portfolio URL</label>
                      <Input id="portfolio-url" placeholder="https://yourportfolio.com" value={editingPortfolioUrl} onChange={(e) => setEditingPortfolioUrl(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="rounded-full bg-transparent">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button onClick={handleSaveProfile} className="rounded-full">
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Primary email</p>
              <p className="text-sm font-medium">{email}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-profile-in-learn"
                  checked={showProfileInLearn}
                  onCheckedChange={handleToggleProfileVisibility}
                />
                <Label htmlFor="show-profile-in-learn" className="text-sm text-muted-foreground">
                  Show profile on Learn page
                </Label>
              </div>
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
  const [learned, setLearned] = useState<Skill[]>([])
  const [taught, setTaught] = useState<Skill[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isSignedIn: _isSignedIn, user } = useUser() // Renamed isSignedIn
  const [isLoadingSkills, setIsLoadingSkills] = useState(true); // New state for loading skills

  useEffect(() => {
    if (user) {
      // Load from local storage first
      const storedLearnedSkills = localStorage.getItem('learnedSkills');
      const storedTaughtSkills = localStorage.getItem('taughtSkills');

      if (storedLearnedSkills) {
        setLearned(JSON.parse(storedLearnedSkills));
      }
      if (storedTaughtSkills) {
        setTaught(JSON.parse(storedTaughtSkills));
      }
      fetchSkills(); // Then fetch fresh data
    }
  }, [user]);

  // WebSocket connection and event handling
  useEffect(() => {
    const socket = io("http://localhost:3001"); // Connect to standalone Socket.IO server

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socket.on("skillAdded", (newSkill: Skill) => {
      console.log("Skill added via WebSocket:", newSkill);
      if (newSkill.type === "learned") {
        setLearned((prev) => [newSkill, ...prev]);
      } else {
        setTaught((prev) => [newSkill, ...prev]);
      }
    });

    socket.on("skillRemoved", (skillId: string) => {
      console.log("Skill removed via WebSocket:", skillId);
      setLearned((prev) => prev.filter((skill) => skill.id !== skillId));
      setTaught((prev) => prev.filter((skill) => skill.id !== skillId));
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchSkills = async () => {
    try {
      setIsLoadingSkills(true); // Set loading to true
      const response = await fetch("/api/user-skills");
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data: Skill[] = await response.json();
      setLearned(data.filter(s => s.type === "learned"));
      setTaught(data.filter(s => s.type === "taught"));
      localStorage.setItem('learnedSkills', JSON.stringify(data.filter(s => s.type === "learned")));
      localStorage.setItem('taughtSkills', JSON.stringify(data.filter(s => s.type === "taught")));
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setIsLoadingSkills(false); // Set loading to false regardless of success or failure
    }
  };

  // Dialog state
  const [open, setOpen] = useState(false)
  // Removed individual skill state as they are now managed within SkillFormDialog
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isSavingSkill, _setIsSavingSkill] = useState(false) // Renamed for intentional unused
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);

  const totalSkills = learned.length + taught.length

  // Refactored handleSaveSkill to be passed to SkillFormDialog
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleSaveSkill(skill: Omit<Skill, "id">, _addAnother: boolean) { // Renamed addAnother
    if (!user) {
      toast.error("You need to be logged in to add a skill.");
      return; // Ensure user is logged in
    }

    const tempId = uid(); // Temporary ID for optimistic update
    const newSkillWithTempId: Skill = { ...skill, id: tempId };

    // Optimistically update the UI for the new skill
    if (newSkillWithTempId.type === "learned") {
      setLearned((prev) => [newSkillWithTempId, ...prev]);
    } else {
      setTaught((prev) => [newSkillWithTempId, ...prev]);
    }

    try {
      const response = await fetch("/api/user-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skill),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to add skill: ${skill.name}`);
      }
      const savedSkill: Skill = await response.json();
      // Update UI with actual saved skill ID and update local storage
      if (savedSkill.type === "learned") {
        setLearned((prev) => {
          const updatedLearned = prev.map(s => s.id === tempId ? savedSkill : s);
          localStorage.setItem('learnedSkills', JSON.stringify(updatedLearned));
          return updatedLearned;
        });
      } else {
        setTaught((prev) => {
          const updatedTaught = prev.map(s => s.id === tempId ? savedSkill : s);
          localStorage.setItem('taughtSkills', JSON.stringify(updatedTaught));
          return updatedTaught;
        });
      }
      toast.success(`Skill "${skill.name}" added successfully!`);
    } catch (error) {
      console.error(`Failed to add skill ${skill.name}:`, error);
      toast.error(`Failed to add skill "${skill.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert optimistic update for this specific failed skill and update local storage
      if (newSkillWithTempId.type === "learned") {
        setLearned((prev) => {
          const revertedLearned = prev.filter(s => s.id !== tempId);
          localStorage.setItem('learnedSkills', JSON.stringify(revertedLearned));
          return revertedLearned;
        });
      } else {
        setTaught((prev) => {
          const revertedTaught = prev.filter(s => s.id !== tempId);
          localStorage.setItem('taughtSkills', JSON.stringify(revertedTaught));
          return revertedTaught;
        });
      }
    }
    // setIsSavingSkill(false); // This is managed within SkillFormDialog now
  }

  async function removeSkill(id: string, type: Skill["type"]) {
    if (!user) {
      toast.error("You need to be logged in to remove a skill.");
      return;
    }
    let skillToRemove: Skill | undefined; // Declare skillToRemove here
    try {
      setDeletingSkillId(id);

      // Optimistically remove the skill from the UI
      setLearned((prev) => {
        const foundSkill = prev.find(s => s.id === id);
        if (foundSkill) {
          skillToRemove = foundSkill;
        }
        return prev.filter((skill) => skill.id !== id);
      });
      if (!skillToRemove) {
        setTaught((prev) => {
          const foundSkill = prev.find(s => s.id === id);
          if (foundSkill) {
            skillToRemove = foundSkill;
          }
          return prev.filter((skill) => skill.id !== id);
        });
      }

      const response = await fetch("/api/user-skills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove skill from database.");
      }

      toast.success("Skill removed successfully!");
      // Update local storage after successful removal
      if (type === "learned") {
        setLearned((prev) => {
          const updatedLearned = prev.filter((skill) => skill.id !== id);
          localStorage.setItem('learnedSkills', JSON.stringify(updatedLearned));
          return updatedLearned;
        });
      } else {
        setTaught((prev) => {
          const updatedTaught = prev.filter((skill) => skill.id !== id);
          localStorage.setItem('taughtSkills', JSON.stringify(updatedTaught));
          return updatedTaught;
        });
      }
    } catch (error) {
      console.error("Failed to remove skill:", error);
      toast.error(`Failed to remove skill: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert optimistic update on error
      if (skillToRemove) {
        if (skillToRemove.type === "learned") {
          setLearned((prev) => [...prev, skillToRemove!]);
        } else {
          setTaught((prev) => [...prev, skillToRemove!]);
        }
      }
    } finally {
      setDeletingSkillId(null);
    }
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
          <SkillFormDialog open={open} onOpenChange={setOpen} onSaveSkill={handleSaveSkill} />
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
              {isLoadingSkills ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading skills...</span>
                </div>
              ) : (
                learned.map((s) => (
                  <Badge key={s.id} variant="outline" className="px-3 py-1 rounded-full">
                    <span className="mr-2">{s.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", levelColor(s.level))}>{s.level}</span>
                    <Button variant="ghost" size="icon" className="ml-1 h-4 w-4 rounded-full" onClick={() => removeSkill(s.id, s.type)} disabled={deletingSkillId === s.id}>
                      {deletingSkillId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </Badge>
                ))
              )}
              {!isLoadingSkills && learned.length === 0 && <p className="text-sm text-muted-foreground">No learned skills yet.</p>}
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
              {isLoadingSkills ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading skills...</span>
                </div>
              ) : (
                taught.map((s) => (
                  <Badge key={s.id} variant="outline" className="px-3 py-1 rounded-full">
                    <span className="mr-2">{s.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", levelColor(s.level))}>{s.level}</span>
                    <Button variant="ghost" size="icon" className="ml-1 h-4 w-4 rounded-full" onClick={() => removeSkill(s.id, s.type)} disabled={deletingSkillId === s.id}>
                      {deletingSkillId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </Badge>
                ))
              )}
              {!isLoadingSkills && taught.length === 0 && <p className="text-sm text-muted-foreground">No taught skills yet.</p>}
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
  const { user } = useUser();

  const items = [
    {
      id: uid(),
      title: "GitHub Repositories",
      description: "Code, contributions, open-source work, and experiments.",
      url: user?.publicMetadata?.githubUrl as string || "",
      icon: Github,
      kind: "GitHub" as const,
    },
    {
      id: uid(),
      title: "Portfolio",
      description: "Designs, case studies, and demos.",
      url: user?.publicMetadata?.portfolioUrl as string || "",
      icon: Globe,
      kind: "Portfolio" as const,
    },
  ].filter(link => link.url !== "") as PortfolioLink[]; // Filter out default/empty links

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
            >
              {/* Using Recharts per shadcn/ui chart helper */}
              {/* We avoid bringing full chart code here; ChartTooltip handles consistent tooltip styles */}
              {/* The line/bar components rely on --color-skills and --color-projects */}
              {/* The ChartContainer provides context variables for theme colors */}
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip>
                    <ChartTooltipContent />
                  </ChartTooltip>
                  <Bar dataKey="skills" fill="var(--color-skills)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="projects" stroke="var(--color-projects)" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
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
            <Image src="/leaf-logo.jpg" alt="SkillCollab logo" width={24} height={24} />
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
      <Navbar />
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
