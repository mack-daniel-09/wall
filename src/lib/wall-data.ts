import { getSupabase } from "@/lib/supabase"

export type Post = {
  id: string
  author: string
  body: string
  imageUrl: string | null
  createdAt: number
}

/** Shape of a row in the `posts` table. */
export type PostRow = {
  id: string
  author: string
  body: string
  image_path: string | null
  created_at: string
}

export const profile = {
  name: "Greg Wientjes",
  subtitle: "wall",
  // Your profile picture: put the file at public/profile.jpg.
  photo: "/profile.jpg",
  // Shown instead while public/profile.jpg doesn't exist (or fails to load).
  photoFallback: "/avatar.svg",
  networks: "Stanford Alum",
  city: "Palo Alto, CA",
}

export const MAX_POST_LENGTH = 280

/** Supabase Storage bucket for post photos (created by supabase/migrations/0002_post_photos.sql). */
export const PHOTO_BUCKET = "post-images"
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

const POST_COLUMNS = "id, author, body, image_path, created_at"

export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    author: row.author,
    body: row.body ?? "",
    imageUrl: row.image_path
      ? getSupabase().storage.from(PHOTO_BUCKET).getPublicUrl(row.image_path).data.publicUrl
      : null,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export async function fetchPosts(limit = 50): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    const hint = error.message.includes("image_path")
      ? " Run supabase/migrations/0002_post_photos.sql in the Supabase SQL Editor."
      : ""
    throw new Error(`Could not load posts: ${error.message}.${hint}`)
  }
  return (data as PostRow[]).map(toPost)
}

/** Returns a problem with the file, or null if it can be uploaded. */
export function validatePhoto(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return "Please choose a JPG, PNG, GIF or WebP image."
  if (file.size > MAX_PHOTO_BYTES) return "That photo is larger than 5 MB."
  return null
}

async function uploadPhoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
  const path = `posts/${crypto.randomUUID()}.${ext}`
  const { error } = await getSupabase()
    .storage.from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false })

  if (error) {
    const hint = /bucket not found/i.test(error.message)
      ? ` The "${PHOTO_BUCKET}" bucket is missing. Run supabase/migrations/0002_post_photos.sql in the Supabase SQL Editor.`
      : ""
    throw new Error(`Failed to upload photo: ${error.message}.${hint}`)
  }
  return path
}

export async function createPost(author: string, body: string, photo?: File | null): Promise<Post> {
  const image_path = photo ? await uploadPhoto(photo) : null

  const { data, error } = await getSupabase()
    .from("posts")
    .insert({ author, body, image_path })
    .select(POST_COLUMNS)
    .single()

  if (error) throw new Error(error.message)
  return toPost(data as PostRow)
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.floor((now - timestamp) / 1000)
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
