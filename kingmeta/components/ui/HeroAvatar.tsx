'use client'

import React from 'react'

interface HeroAvatarProps {
  src: string
  alt: string
  className?: string
  heroId?: string | number
}

export function HeroAvatar({ src, alt, className, heroId }: HeroAvatarProps) {
  const fallback = heroId
    ? `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${heroId}/${heroId}.jpg`
    : '/placeholder-hero.png'

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const img = e.target as HTMLImageElement
        if (img.src !== fallback) img.src = fallback
      }}
    />
  )
}
