"use client"

import { useEffect, useRef } from "react"

interface SparklineProps {
  data?: number[]
  width?: number
  height?: number
  color?: string
  isPositive?: boolean
}

export function Sparkline({
  data = [0.3, 0.7, 0.4, 0.8, 0.6, 0.9, 0.5, 0.8, 0.7, 1.0],
  width = 60,
  height = 24,
  color,
  isPositive = true,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set proper scaling for retina displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Set canvas size in CSS pixels
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (!data || data.length === 0) return

    const xScale = width / (data.length - 1)
    const yMin = Math.min(...data)
    const yMax = Math.max(...data)
    const yRange = yMax - yMin || 1

    // Scale to leave some padding
    const padding = height * 0.1
    const yScale = (height - 2 * padding) / yRange

    // Set line style
    ctx.beginPath()
    ctx.strokeStyle = color || (isPositive ? "#10b981" : "#ef4444")
    ctx.lineWidth = 1.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Draw the line
    data.forEach((value, i) => {
      const x = i * xScale
      const y = height - padding - (value - yMin) * yScale

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Add subtle glow effect
    ctx.shadowColor = color || (isPositive ? "#10b981" : "#ef4444")
    ctx.shadowBlur = 2
    ctx.stroke()
  }, [data, width, height, color, isPositive])

  return <canvas ref={canvasRef} className="inline-block" />
}
