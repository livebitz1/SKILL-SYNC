"use client"

import React, { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'

export default function CreateProjectPage() {
  const { user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Web Development')
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [difficulty, setDifficulty] = useState('Beginner')
  const [teamSize, setTeamSize] = useState<number | ''>('')
  const [status, setStatus] = useState('Open')
  const [durationWeeks, setDurationWeeks] = useState<number | ''>('')
  const [attachments, setAttachments] = useState<string>('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function addSkill() {
    const v = skillInput.trim()
    if (!v) return
    if (requiredSkills.includes(v)) {
      setSkillInput('')
      return
    }
    setRequiredSkills((s) => [...s, v])
    setSkillInput('')
  }

  async function removeSkill(s: string) {
    setRequiredSkills((arr) => arr.filter((x) => x !== s))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      toast.error('You must be signed in to create a project')
      return
    }
    if (!title || !shortDescription || !description) {
      toast.error('Please fill required fields')
      return
    }

    setIsSaving(true)
    try {
      // include any pending skill typed but not explicitly added
      const finalSkills = (() => {
        const pending = skillInput.trim() ? [skillInput.trim()] : []
        return Array.from(new Set([...requiredSkills, ...pending].map(s => s.trim()).filter(Boolean)))
      })()

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          shortDescription,
          description,
          category,
          requiredSkills: finalSkills,
          difficulty,
          teamSize: teamSize === '' ? null : Number(teamSize),
          status,
          durationWeeks: durationWeeks === '' ? null : Number(durationWeeks),
          creatorId: user.id,
          attachments: attachments ? attachments.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          bannerUrl: bannerUrl || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to create project')
      const data = await res.json()
      toast.success('Project created')
      router.push('/projects')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to create project')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold text-green-700">Start a new project</h1>
        <p className="text-gray-600 mt-2">Fill in details and publish your project to the community.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Project Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Build a Portfolio Platform" />
          </div>

          <div>
            <label className="text-sm font-medium">Short Description</label>
            <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A one-liner summary" />
          </div>

          <div>
            <label className="text-sm font-medium">Detailed Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg min-h-[140px]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Project Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
                <option>Web Development</option>
                <option>Design</option>
                <option>AI</option>
                <option>Marketing</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Difficulty Level</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Required Skills (tags)</label>
            <div className="flex gap-2 items-center mt-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill and press Enter" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
              <Button type="button" onClick={addSkill} className="bg-green-600 text-white">Add</Button>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {requiredSkills.map((s) => (
                <Badge key={s} className="bg-green-50 text-green-700 border-green-100 inline-flex items-center gap-2">
                  <span>{s}</span>
                  <button type="button" onClick={() => removeSkill(s)} className="text-xs text-gray-500">×</button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Team Size / Roles Needed</label>
              <Input value={teamSize as any} onChange={(e) => setTeamSize(e.target.value ? Number(e.target.value) : '')} placeholder="e.g., 4" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg">
                <option>Open</option>
                <option>Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Timeline / Duration (weeks)</label>
              <Input value={durationWeeks as any} onChange={(e) => setDurationWeeks(e.target.value ? Number(e.target.value) : '')} placeholder="e.g., 6" />
            </div>

            <div>
              <label className="text-sm font-medium">Attachments / Links (comma separated)</label>
              <Input value={attachments} onChange={(e) => setAttachments(e.target.value)} placeholder="https://github.com/..., https://docs" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Thumbnail / Banner Image URL (optional)</label>
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="flex items-center gap-3 justify-end">
            <Link href="/projects">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" className="bg-green-600 text-white" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create Project'}</Button>
          </div>
        </form>
      </main>
    </div>
  )
}
