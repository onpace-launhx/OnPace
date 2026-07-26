import { redirect } from "next/navigation"

export default function PersonalizationRedirectPage() {
  redirect("/ai-assistant?mode=personalized")
}
