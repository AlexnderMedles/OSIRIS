import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  console.log("[v0] HomePage: Starting authentication check")

  try {
    const supabase = await createClient()
    console.log("[v0] HomePage: Supabase client created")

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    console.log("[v0] HomePage: User check result", { user: !!user, error })

    if (error) {
      console.log("[v0] HomePage: Auth error, redirecting to login", error)
      redirect("/auth/login")
    }

    if (user) {
      console.log("[v0] HomePage: User authenticated, redirecting to messenger")
      redirect("/messenger")
    } else {
      console.log("[v0] HomePage: No user, redirecting to login")
      redirect("/auth/login")
    }
  } catch (error) {
    console.log("[v0] HomePage: Caught error, redirecting to login", error)
    redirect("/auth/login")
  }
}
