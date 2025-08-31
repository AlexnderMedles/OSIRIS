import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MessengerLayout } from "@/components/messenger/messenger-layout"

export default async function MessengerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return <MessengerLayout user={user} profile={profile} />
}
