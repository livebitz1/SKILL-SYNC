"use client"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"

type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert"
type SkillCategory = "Frontend" | "Backend" | "DevOps" | "Design" | "Data" | "Other"
type SkillType = "learned" | "taught"
type Skill = {
  id: string
  name: string
  level: SkillLevel
  category: SkillCategory
  type: SkillType
}

type SkillFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveSkill: (skill: Omit<Skill, "id">, addAnother: boolean) => Promise<void>
}

export function SkillFormDialog({ open, onOpenChange, onSaveSkill }: SkillFormDialogProps) {
  const { user } = useUser()
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>("Beginner")
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>("Frontend")
  const [newSkillType, setNewSkillType] = useState<SkillType>("learned")
  const [isSavingSkill, setIsSavingSkill] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success">("idle")
  const NAME_MAX = 50
  const trimmedName = newSkillName.trim()
  const canSave = trimmedName.length > 0 && trimmedName.length <= NAME_MAX

  async function handleSave(addAnother: boolean) {
    if (!user) {
      toast.error("You need to be logged in to add a skill.")
      return
    }
    if (!trimmedName) {
      toast.error("Skill name cannot be empty.")
      return
    }
    if (trimmedName.length > NAME_MAX) {
      toast.error(`Skill name is too long (max ${NAME_MAX} characters).`)
      return
    }

    setIsSavingSkill(true)
    setSaveState("saving")
    try {
      await onSaveSkill(
        {
          name: trimmedName,
          level: newSkillLevel,
          category: newSkillCategory,
          type: newSkillType,
        },
        addAnother,
      )

      setSaveState("success")
      setNewSkillName("") // clear only name by default

      const finalize = () => {
        setIsSavingSkill(false)
        setSaveState("idle")
      }

      if (addAnother) {
        // brief success state, keep dialog open and focus the name field
        setTimeout(finalize, 700)
      } else {
        // brief success state, then close and reset the selects
        setTimeout(() => {
          onOpenChange(false)
          setNewSkillLevel("Beginner")
          setNewSkillCategory("Frontend")
          setNewSkillType("learned")
          finalize()
        }, 700)
      }
    } catch (error) {
      console.error("Failed to save skill:", error)
      toast.error(`Failed to save skill: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsSavingSkill(false)
      setSaveState("idle")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add a new skill</DialogTitle>
          <DialogDescription>Add a learned or taught skill with level and category.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave && !isSavingSkill) handleSave(false)
          }}
          className="contents"
        >
          <div className="grid gap-3 py-2">
            <div>
              <label htmlFor="skill-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="skill-name"
                placeholder="e.g., React, Figma, Docker"
                value={newSkillName}
                maxLength={NAME_MAX}
                aria-invalid={!canSave && trimmedName.length > 0 ? true : undefined}
                aria-describedby="skill-name-hint skill-name-count"
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    if (e.shiftKey) {
                      if (canSave && !isSavingSkill) handleSave(true)
                    } else {
                      if (canSave && !isSavingSkill) handleSave(false)
                    }
                  }
                }}
              />
              <div className="mt-1 flex items-center justify-between">
                <p id="skill-name-hint" className="text-xs text-muted-foreground">
                  Add concise names; avoid duplicates.
                </p>
                <p id="skill-name-count" className="text-xs text-muted-foreground">
                  {trimmedName.length}/{NAME_MAX}
                </p>
              </div>
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
                <Select value={newSkillCategory} onValueChange={(v: SkillCategory) => setNewSkillCategory(v)}>
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
                <Select value={newSkillType} onValueChange={(v: SkillType) => setNewSkillType(v)}>
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
              <Button type="button" variant="outline" className="rounded-full bg-transparent">
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSavingSkill || !canSave}
              variant="secondary"
              className="rounded-full"
              aria-disabled={isSavingSkill || !canSave}
            >
              {isSavingSkill && saveState === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Adding…
                </span>
              ) : (
                "Add Another"
              )}
            </Button>

            <Button
              type="submit"
              disabled={isSavingSkill || !canSave}
              className="rounded-full"
              aria-live="polite"
              aria-busy={isSavingSkill}
              aria-disabled={isSavingSkill || !canSave}
            >
              {saveState === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </span>
              ) : saveState === "success" ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Saved
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
