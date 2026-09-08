import Image from "next/image"

export function HeroBanner() {
  return (
    <div className="bg-card p-2">
      <div className="relative aspect-[21/6] w-full overflow-hidden rounded-sm">
        <Image
          src="/hero-ship.jpg"
          alt="Swire Bulk cargo vessel at sea"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
    </div>
  )
}
