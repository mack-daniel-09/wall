import { Card } from "@/components/ui/card"
import { ProfileSidebar } from "@/components/wall/profile-sidebar"
import { WallFeed } from "@/components/wall/wall-feed"
import { isSupabaseConfigured } from "@/lib/supabase"
import { fetchPosts, type Post } from "@/lib/wall-data"

// Always read the latest posts from Supabase instead of prerendering at build time.
export const dynamic = "force-dynamic"

export default async function Home() {
  let posts: Post[] = []
  let loadError: string | null = null

  if (!isSupabaseConfigured) {
    loadError =
      "Supabase isn't configured yet. Copy .env.example to .env.local, add your project URL and publishable key, then restart the dev server."
  } else {
    try {
      posts = await fetchPosts()
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Could not load posts."
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 md:p-4 dark:bg-neutral-950">
      <Card className="mx-auto max-w-[1400px] gap-0 overflow-hidden rounded-none py-0 shadow-sm md:rounded-lg">
        <header className="bg-blue-500 px-8 py-4">
          <span className="text-2xl font-bold text-white">wall</span>
        </header>
        <div className="flex flex-col md:flex-row">
          <ProfileSidebar />
          <WallFeed initialPosts={posts} loadError={loadError} canPost={isSupabaseConfigured} />
        </div>
      </Card>
    </main>
  )
}
