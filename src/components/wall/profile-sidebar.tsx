import { ProfilePhoto } from "@/components/wall/profile-photo"
import { profile } from "@/lib/wall-data"

export function ProfileSidebar() {
  return (
    <aside className="border-b border-gray-200 p-6 md:w-80 md:shrink-0 md:border-r md:border-b-0">
      <div className="mb-8">
        <div className="mb-6">
          <div className="relative h-80 w-64 max-w-full shrink-0 overflow-hidden rounded-lg">
            <ProfilePhoto src={profile.photo} fallbackSrc={profile.photoFallback} alt={profile.name} />
          </div>
        </div>
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">{profile.name}</h2>
          <h3 className="mb-4 text-xl font-normal text-gray-700">{profile.subtitle}</h3>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-block rounded border-2 border-gray-200 bg-gray-100 p-3">
          <h3 className="text-sm font-medium text-gray-700">Information</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 text-sm font-medium text-gray-900">Networks</div>
          <div className="text-sm text-gray-700">{profile.networks}</div>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium text-gray-900">Current City</div>
          <div className="text-sm text-gray-700">{profile.city}</div>
        </div>
      </div>
    </aside>
  )
}
