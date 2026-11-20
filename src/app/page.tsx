import { ProfileSidebar } from "@/components/wall/profile-sidebar"
import { WallFeed } from "@/components/wall/wall-feed"
import { isSupabaseConfigured } from "@/lib/supabase"
import { fetchPosts, type Post } from "@/lib/wall-data"

// Always read the latest posts from Supabase instead of prerendering at build time.
export const dynamic = "force-dynamic"

export default async function Home() {
  let posts: Post[] = []
  let loadError: string | null = null

  if (isSupabaseConfigured) {
    try {
      posts = await fetchPosts()
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Could not load posts."
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      <header className="mx-4 mt-4 rounded-t-lg bg-blue-500 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">wall</h1>
        </div>
      </header>
      <div className="mx-4 flex flex-col rounded-b-lg bg-white shadow-sm md:flex-row">
        <ProfileSidebar />
        <main className="min-w-0 flex-1 p-6">
          <WallFeed initialPosts={posts} loadError={loadError} canPost={isSupabaseConfigured} />
        </main>
      </div>
    </div>
  )
}
