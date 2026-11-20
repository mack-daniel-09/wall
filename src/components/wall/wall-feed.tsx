"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getSupabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
  ALLOWED_PHOTO_TYPES,
  MAX_POST_LENGTH,
  createPost,
  profile,
  timeAgo,
  toPost,
  validatePhoto,
  type Post,
  type PostRow,
} from "@/lib/wall-data"

type WallFeedProps = {
  initialPosts: Post[]
  loadError: string | null
  canPost: boolean
}

/** Add a post to the list unless it is already there, keeping newest first. */
function prepend(posts: Post[], post: Post): Post[] {
  if (posts.some((p) => p.id === post.id)) return posts
  return [post, ...posts].sort((a, b) => b.createdAt - a.createdAt)
}

export function WallFeed({ initialPosts, loadError, canPost }: WallFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [draft, setDraft] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(loadError)
  const fileInput = useRef<HTMLInputElement>(null)
  // Posts present on first load don't animate; anything added later fades in.
  const [initialIds] = useState(() => new Set(initialPosts.map((p) => p.id)))

  // Keep relative timestamps fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Live updates: show posts added from other browsers.
  useEffect(() => {
    if (!canPost) return
    const supabase = getSupabase()
    const channel = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) => prepend(prev, toPost(payload.new as PostRow)))
          setNow(Date.now())
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [canPost])

  // Free the preview's object URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function choosePhoto(file: File | undefined) {
    if (!file) return
    const problem = validatePhoto(file)
    if (problem) {
      setError(problem)
      if (fileInput.current) fileInput.current.value = ""
      return
    }
    setError(null)
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  const remaining = MAX_POST_LENGTH - draft.length
  const hasContent = draft.trim().length > 0 || photo !== null
  const canShare = canPost && !sharing && hasContent && remaining >= 0

  async function share() {
    if (!canShare) return
    setSharing(true)
    setError(null)
    try {
      const post = await createPost(profile.name, draft.trim(), photo)
      setPosts((prev) => prepend(prev, post))
      setDraft("")
      clearPhoto()
      setNow(Date.now())
    } catch (err) {
      setError(err instanceof Error ? `Couldn't share your post: ${err.message}` : "Couldn't share your post.")
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="max-w-none">
      {!canPost && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">Supabase isn&apos;t configured yet, so posts can&apos;t be loaded or shared.</p>
          <p className="mt-2 text-xs text-yellow-600">
            💡 Copy .env.example to .env.local, add your project URL and key, then restart the dev server.
          </p>
        </div>
      )}

      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault()
          share()
        }}
      >
        <div className="mb-4">
          <div className="rounded border-2 border-dashed border-gray-300 bg-gradient-to-r from-blue-50 via-blue-50 to-transparent p-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) share()
              }}
              rows={3}
              maxLength={MAX_POST_LENGTH}
              placeholder="What's on your mind?"
              aria-label="What's on your mind?"
              disabled={!canPost || sharing}
              className="field-sizing-fixed mb-1.5 h-18 min-h-0 resize-none leading-6 rounded-none border-none bg-transparent p-0 text-base text-gray-900 shadow-none placeholder:text-gray-500 focus-visible:ring-0 disabled:bg-transparent md:text-base dark:bg-transparent"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">{remaining} characters remaining</span>
          </div>
        </div>

        <div className="mb-4">
          <input
            ref={fileInput}
            type="file"
            accept={ALLOWED_PHOTO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />
          {photoPreview ? (
            <div className="relative animate-in duration-300 fade-in motion-reduce:animate-none">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={photoPreview} alt="Selected photo" className="h-48 w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                disabled={sharing}
                aria-label="Remove photo"
                className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canPost || sharing}
              onClick={() => fileInput.current?.click()}
              className="flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">
                  <span className="font-semibold">Click to add photo</span> (optional)
                </span>
                <span className="mt-1 text-xs text-gray-400">JPG, PNG, GIF up to 5MB</span>
              </span>
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sharing && photo && (
              <span className="flex items-center gap-2 text-sm text-blue-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading photo...
              </span>
            )}
          </div>
          <Button
            type="submit"
            disabled={!canShare}
            className="h-10 rounded px-8 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-100"
          >
            {sharing ? "Sharing..." : "Share"}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {posts.length === 0 && !error ? (
          <div className="py-8 text-center text-gray-500">
            <p>No messages yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={cn(
                !initialIds.has(post.id) &&
                  "animate-in duration-500 ease-out fade-in slide-in-from-top-3 motion-reduce:animate-none"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <h4 className="text-lg font-bold text-gray-900">{post.author}</h4>
                <time
                  dateTime={new Date(post.createdAt).toISOString()}
                  className="shrink-0 text-sm text-gray-500"
                  suppressHydrationWarning
                >
                  {timeAgo(post.createdAt, now)}
                </time>
              </div>
              {post.body && (
                <div className="mb-4 text-base leading-relaxed break-words whitespace-pre-wrap text-gray-800">
                  {post.body}
                </div>
              )}
              {post.imageUrl && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- images come from the Supabase bucket */}
                  <img
                    src={post.imageUrl}
                    alt="Shared photo"
                    loading="lazy"
                    className="w-full max-w-md rounded-lg object-cover shadow-sm"
                  />
                </div>
              )}
              <hr className="mb-6 border-gray-300" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
