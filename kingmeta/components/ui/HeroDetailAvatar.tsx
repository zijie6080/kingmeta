'use client'

interface HeroDetailAvatarProps {
  src: string
  fallback: string
  name: string
  className?: string
}

export default function HeroDetailAvatar({ src, fallback, name, className }: HeroDetailAvatarProps) {
  return (
    <img
      src={src}
      alt={name}
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback }}
    />
  )
}
