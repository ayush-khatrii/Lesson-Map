"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Lesson = {
  id: string
  lessonName: string
  order: number
}

type Module = {
  id: string
  moduleName: string
  description: string
  order: number
  Lesson: Lesson[]
}

type Course = {
  id: string
  courseName: string
  description: string
  Module: Module[]
}

const SingleOutline = ({ course }: { course: Course }) => {
  const modules = course.Module ?? []

  const [activeModule, setActiveModule] = useState<Module | null>(
    modules.length ? modules[0] : null
  )
  const [search, setSearch] = useState("")
  const [completedLessons, setCompletedLessons] = useState<Record<string, string[]>>({})

  /* ---------- local progress ---------- */
  useEffect(() => {
    const stored = localStorage.getItem(`course-progress-${course.id}`)
    if (stored) setCompletedLessons(JSON.parse(stored))
  }, [course.id])

  useEffect(() => {
    localStorage.setItem(
      `course-progress-${course.id}`,
      JSON.stringify(completedLessons)
    )
  }, [completedLessons, course.id])

  const toggleLesson = (moduleId: string, lessonId: string) => {
    setCompletedLessons((prev) => {
      const list = prev[moduleId] || []
      return {
        ...prev,
        [moduleId]: list.includes(lessonId)
          ? list.filter((id) => id !== lessonId)
          : [...list, lessonId],
      }
    })
  }

  const filteredModules = modules.filter(
    (m) =>
      m.moduleName.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{course.courseName}</h1>
        <p className="text-muted-foreground">{course.description}</p>
      </div>

      <Input
        placeholder="Search modules..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {modules.length === 0 && (
        <p className="text-center text-muted-foreground">
          No modules added yet
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          {filteredModules.map((module, idx) => (
            <div
              key={module.id}
              onClick={() => setActiveModule(module)}
              className={cn(
                "border rounded-lg p-4 cursor-pointer",
                activeModule?.id === module.id
                  ? "border-primary bg-primary/10"
                  : "bg-muted/40"
              )}
            >
              <div className="flex justify-between mb-1">
                <Badge>Module {idx + 1}</Badge>
                <Badge variant="outline">
                  {completedLessons[module.id]?.length ?? 0}/
                  {module.Lesson.length}
                </Badge>
              </div>

              <h2 className="font-semibold">{module.moduleName}</h2>
              <p className="text-muted-foreground text-sm">
                {module.description}
              </p>
            </div>
          ))}
        </div>

        <div className="col-span-2 border rounded-lg p-6">
          {!activeModule ? (
            <p className="text-muted-foreground">Select a module</p>
          ) : activeModule.Lesson.length === 0 ? (
            <p className="text-muted-foreground">
              No lessons in this module
            </p>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">
                {activeModule.moduleName}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeModule.Lesson.map((lesson, i) => (
                  <div
                    key={lesson.id}
                    className="border rounded-md p-3 flex items-center"
                  >
                    <span className="mr-2 font-medium">{i + 1}.</span>
                    <span className="flex-1">{lesson.lessonName}</span>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        toggleLesson(activeModule.id, lesson.id)
                      }
                    >
                      <CheckCircle2
                        className={cn(
                          "h-5 w-5",
                          completedLessons[activeModule.id]?.includes(lesson.id)
                            ? "text-green-500"
                            : "text-gray-400"
                        )}
                      />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default SingleOutline
