"use client"

export default function NumberPage() {
  // Generate numbers from 1 to 1,000,000
  const numbers = Array.from({ length: 1000000 }, (_, i) => i + 1)

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">v0 is an idiot who is worth nothing</h1>
      <div className="text-sm leading-tight">{numbers.join("")}</div>
    </div>
  )
}
