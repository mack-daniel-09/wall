"use client"

import Image from "next/image"
import { useState } from "react"

type ProfilePhotoProps = {
  src: string
  fallbackSrc: string
  alt: string
}

/** Profile picture that falls back to the placeholder if the real photo is missing. */
export function ProfilePhoto({ src, fallbackSrc, alt }: ProfilePhotoProps) {
  const [current, setCurrent] = useState(src)

  return (
    <Image
      src={current}
      alt={alt}
      fill
      priority
      sizes="(min-width: 768px) 320px, 160px"
      className="object-cover"
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc)
      }}
    />
  )
}
