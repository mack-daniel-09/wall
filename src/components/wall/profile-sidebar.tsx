import { ProfilePhoto } from "@/components/wall/profile-photo"
import { Button } from "@/components/ui/button"
import { profile } from "@/lib/wall-data"

export function ProfileSidebar() {
  return (
    <aside className="border-b p-6 md:w-[400px] md:shrink-0 md:border-r md:border-b-0 md:p-8">
      <div className="relative aspect-[4/5] w-full max-w-40 md:max-w-80overflow-hidden rounded-lg bg-muted">
        <ProfilePhoto src={profile.photo} fallbackSrc={profile.photoFallback} alt={profile.name} />
      </div>

      <h1 className="mt-8 text-3xl font-bold tracking-tight">{profile.name}</h1>
      <p className="mt-1 text-2xl text-muted-foreground">{profile.subtitle}</p>

      <Button variant="outline" className="mt-10 h-auto bg-muted px-4 py-3 text-base font-normal">
        Information
      </Button>

      <dl className="mt-10 space-y-6">
        <div>
          <dt className="font-semibold">Networks</dt>
          <dd className="mt-1 text-muted-foreground">{profile.networks}</dd>
        </div>
        <div>
          <dt className="font-semibold">Current City</dt>
          <dd className="mt-1 text-muted-foreground">{profile.city}</dd>
        </div>
      </dl>
    </aside>
  )
}
