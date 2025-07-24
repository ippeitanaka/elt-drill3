import { supabase } from "./supabase"
import type { User } from "./types"

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  if (error) throw error

  // Create user profile
  if (data.user) {
    const { error: profileError } = await supabase.from("users").insert({
      id: data.user.id,
      name,
      email,
      role: "student",
    })

    if (profileError) throw profileError
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  return profile
}

export async function updateUserProfile(updates: Partial<User>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase.from("users").update(updates).eq("id", user.id).select().single()

  if (error) throw error
  return data
}
