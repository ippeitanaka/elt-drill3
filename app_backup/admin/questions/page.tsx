"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuestionEditor } from "@/components/admin/question-editor"
import { QuestionSetManager } from "@/components/admin/question-set-manager"
import { RoleGuard } from "@/components/auth/role-guard"
import { supabase } from "@/lib/supabase"
import type { Category } from "@/lib/types"

export default function QuestionsManagementPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error loading categories:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="container py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">問題管理</h1>
            <p className="text-muted-foreground">問題セットと個別問題の作成・編集・管理</p>
          </div>

          <Tabs defaultValue="question-sets" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="question-sets">問題セット管理</TabsTrigger>
              <TabsTrigger value="questions">問題エディター</TabsTrigger>
            </TabsList>

            <TabsContent value="question-sets">
              <QuestionSetManager categories={categories} onSuccess={loadCategories} />
            </TabsContent>

            <TabsContent value="questions">
              <QuestionEditor categories={categories} onSuccess={loadCategories} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </RoleGuard>
  )
}
