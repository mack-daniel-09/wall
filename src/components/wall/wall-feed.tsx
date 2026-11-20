"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
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
    <section className="min-w-0 flex-1 p-6 md:p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          share()
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) share()
          }}
          maxLength={MAX_POST_LENGTH}
          placeholder="What's on your mind?"
          aria-label="What's on your mind?"
          disabled={!canPost || sharing}
          className="min-h-36 resize-none rounded-md border-2 border-dashed border-neutral-300 bg-blue-50/70 px-5 py-4 text-base md:text-base dark:bg-blue-950/30"
        />

        {photoPreview && (
          <div className="relative mt-4 inline-block animate-in duration-300 fade-in motion-reduce:animate-none">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={photoPreview} alt="Selected photo" className="max-h-60 rounded-md border object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={clearPhoto}
              disabled={sharing}
              aria-label="Remove photo"
              className="absolute top-2 right-2 rounded-full shadow"
            >
              <X />
            </Button>
          </div>
        )}

        <p className="mt-5 text-sm text-muted-foreground">{remaining} characters remaining</p>
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <input
            ref={fileInput}
            type="file"
            accept={ALLOWED_PHOTO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!canPost || sharing}
            onClick={() => fileInput.current?.click()}
            className="h-12 rounded-md px-5 text-base"
          >
            <ImagePlus className="size-5" />
            {photo ? "Change photo" : "Photo"}
          </Button>
          <Button
            type="submit"
            disabled={!canShare}
            className="h-12 rounded-md bg-blue-500 px-10 text-base text-white hover:bg-blue-600 disabled:bg-neutral-200 disabled:text-white disabled:opacity-100"
          >
            {sharing ? "Sharing…" : "Share"}
          </Button>
        </div>
      </form>

      <ul className="mt-4">
        {posts.map((post) => (
          <li
            key={post.id}
            className={cn(
              "border-b py-6",
              !initialIds.has(post.id) &&
                "animate-in duration-500 ease-out fade-in slide-in-from-top-3 motion-reduce:animate-none"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold">{post.author}</h2>
              <time
                dateTime={new Date(post.createdAt).toISOString()}
                className="shrink-0 text-muted-foreground"
                suppressHydrationWarning
              >
                {timeAgo(post.createdAt, now)}
              </time>
            </div>
            {post.body && <p className="mt-3 text-lg break-words whitespace-pre-wrap">{post.body}</p>}
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- images come from the Supabase bucket
              <img
                src={post.imageUrl}
                alt={post.body ? `Photo: ${post.body.slice(0, 80)}` : `Photo shared by ${post.author}`}
                loading="lazy"
                className="mt-4 max-h-[28rem] w-auto max-w-full rounded-md border object-contain"
              />
            )}
          </li>
        ))}
        {!error && posts.length === 0 && (
          <li className="py-10 text-center text-muted-foreground">No posts yet. Be the first to share something!</li>
        )}
      </ul>
    </section>
  )
}
