"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { ChevronRight, ChevronDown, Clock, Server, Tag } from "lucide-react"

// Define the span type
interface Span {
  timestamp: string
  service: string
  span_kind: string
  method: string
  url: string
  span_name: string
  span_id: string
  parent_span_id: string
  status_code: string
  duration_ms: number
}

// Define the tree node structure
interface SpanNode extends Span {
  children: SpanNode[]
  level: number
  startTime: number
  endTime: number
}

interface TraceViewerProps {
  spans: Span[]
  colorByService?: boolean
}

export const TraceViewerEnhanced: React.FC<TraceViewerProps> = ({ spans, colorByService = true }) => {
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [visibleSpans, setVisibleSpans] = useState<SpanNode[]>([])
  const [focusedSpanId, setFocusedSpanId] = useState<string | null>(null)
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Build the span tree and calculate timing information
  const { spanTree, minTime, maxTime, allSpans, serviceColors, spanMap } = useMemo(() => {
    // Convert timestamps to milliseconds for calculations
    const processedSpans = spans.map((span) => {
      const timestamp = new Date(span.timestamp).getTime()
      return {
        ...span,
        startTime: timestamp,
        endTime: timestamp + span.duration_ms,
      }
    })

    // Find min and max timestamps
    const allTimes = processedSpans.flatMap((span) => [span.startTime, span.endTime])
    const minTime = Math.min(...allTimes)
    const maxTime = Math.max(...allTimes)

    // Create a map of spans by ID
    const spanMap = new Map<string, SpanNode>()
    processedSpans.forEach((span) => {
      spanMap.set(span.span_id, {
        ...span,
        children: [],
        level: 0,
      })
    })

    // Build the tree structure
    const rootSpans: SpanNode[] = []

    // First pass: establish parent-child relationships
    processedSpans.forEach((span) => {
      const spanNode = spanMap.get(span.span_id)!

      if (!span.parent_span_id) {
        // This is a root span
        rootSpans.push(spanNode)
      } else {
        // Add this span as a child of its parent
        const parentSpan = spanMap.get(span.parent_span_id)
        if (parentSpan) {
          parentSpan.children.push(spanNode)
        } else {
          // If parent not found, treat as root
          rootSpans.push(spanNode)
        }
      }
    })

    // Second pass: calculate levels by traversing the tree
    const assignLevels = (nodes: SpanNode[], level: number) => {
      nodes.forEach((node) => {
        node.level = level
        if (node.children.length > 0) {
          assignLevels(node.children, level + 1)
        }
      })
    }

    assignLevels(rootSpans, 0)

    // Sort children by timestamp
    const sortChildren = (node: SpanNode) => {
      node.children.sort((a, b) => a.startTime - b.startTime)
      node.children.forEach(sortChildren)
    }

    rootSpans.sort((a, b) => a.startTime - b.startTime)
    rootSpans.forEach(sortChildren)

    // Generate colors for services
    const services = Array.from(new Set(processedSpans.map((span) => span.service)))
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-yellow-500",
    ]

    const serviceColors = Object.fromEntries(services.map((service, index) => [service, colors[index % colors.length]]))

    return {
      spanTree: rootSpans,
      minTime,
      maxTime,
      allSpans: Array.from(spanMap.values()),
      serviceColors,
      spanMap,
    }
  }, [spans])

  // Flatten the tree for display based on expanded state
  useEffect(() => {
    const flattenTree = (nodes: SpanNode[], result: SpanNode[] = []) => {
      nodes.forEach((node) => {
        result.push(node)
        if (expandedSpans.has(node.span_id) && node.children.length > 0) {
          flattenTree(node.children, result)
        }
      })
      return result
    }

    setVisibleSpans(flattenTree(spanTree))
  }, [spanTree, expandedSpans])

  // Toggle expand/collapse
  const toggleExpand = useCallback((spanId: string) => {
    setExpandedSpans((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(spanId)) {
        newSet.delete(spanId)
      } else {
        newSet.add(spanId)
      }
      return newSet
    })
  }, [])

  // Calculate the total duration of the trace
  const totalDuration = maxTime - minTime

  // Generate time markers for the waterfall
  const timeMarkers = useMemo(() => {
    if (totalDuration <= 0) return []

    // Determine a nice interval for time markers
    const determineInterval = (duration: number) => {
      if (duration <= 100) return 10 // 10ms intervals for short durations
      if (duration <= 500) return 50 // 50ms intervals
      if (duration <= 1000) return 100 // 100ms intervals
      if (duration <= 5000) return 500 // 500ms intervals
      if (duration <= 10000) return 1000 // 1s intervals
      return Math.ceil(duration / 10 / 1000) * 1000 // Divide into ~10 segments for longer durations
    }

    const interval = determineInterval(totalDuration)
    const markers = []

    // Start from 0 and go to totalDuration in interval steps
    for (let time = 0; time <= totalDuration; time += interval) {
      const position = (time / totalDuration) * 100

      // Format the time label
      let label = ""
      if (time >= 1000) {
        label = `${(time / 1000).toFixed(1)}s`
      } else {
        label = `${time}ms`
      }

      markers.push({ position, label, time })
    }

    return markers
  }, [totalDuration])

  // Initialize with root spans expanded
  useEffect(() => {
    const rootIds = spanTree.map((span) => span.span_id)
    setExpandedSpans(new Set(rootIds))

    // Set focus to the first span if available
    if (spanTree.length > 0) {
      setFocusedSpanId((prevId) => prevId || spanTree[0].span_id)
      setSelectedSpan((prevId) => prevId || spanTree[0].span_id)
    }
  }, [spanTree]) // Remove focusedSpanId from dependencies

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!focusedSpanId) return

      const currentIndex = visibleSpans.findIndex((span) => span.span_id === focusedSpanId)
      if (currentIndex === -1) return

      const currentSpan = visibleSpans[currentIndex]

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          if (currentIndex < visibleSpans.length - 1) {
            const nextSpanId = visibleSpans[currentIndex + 1].span_id
            setFocusedSpanId(nextSpanId)
            setSelectedSpan(nextSpanId)
            rowRefs.current.get(nextSpanId)?.focus()
          }
          break

        case "ArrowUp":
          e.preventDefault()
          if (currentIndex > 0) {
            const prevSpanId = visibleSpans[currentIndex - 1].span_id
            setFocusedSpanId(prevSpanId)
            setSelectedSpan(prevSpanId)
            rowRefs.current.get(prevSpanId)?.focus()
          }
          break

        case "ArrowRight":
          e.preventDefault()
          if (currentSpan.children.length > 0 && !expandedSpans.has(currentSpan.span_id)) {
            toggleExpand(currentSpan.span_id)
          }
          break

        case "ArrowLeft":
          e.preventDefault()
          // If the current span is expanded, collapse it
          if (currentSpan.children.length > 0 && expandedSpans.has(currentSpan.span_id)) {
            toggleExpand(currentSpan.span_id)
          }
          // If the current span is already collapsed or has no children, move to parent
          else if (currentSpan.parent_span_id) {
            const parentSpanId = currentSpan.parent_span_id
            const parentIndex = visibleSpans.findIndex((span) => span.span_id === parentSpanId)
            if (parentIndex !== -1) {
              setFocusedSpanId(parentSpanId)
              setSelectedSpan(parentSpanId)
              rowRefs.current.get(parentSpanId)?.focus()
            }
          }
          break

        case "Enter":
        case " ": // Space
          e.preventDefault()
          if (currentSpan.children.length > 0) {
            toggleExpand(currentSpan.span_id)
          }
          break
      }
    },
    [focusedSpanId, visibleSpans, expandedSpans, toggleExpand],
  )

  // Focus management
  useEffect(() => {
    // Focus the row when focusedSpanId changes
    if (focusedSpanId) {
      const rowElement = rowRefs.current.get(focusedSpanId)
      if (rowElement) {
        rowElement.focus()
      }
    }
  }, [focusedSpanId])

  // Get span details for the selected span
  const selectedSpanDetails = useMemo(() => {
    if (!selectedSpan) return null
    return allSpans.find((span) => span.span_id === selectedSpan)
  }, [selectedSpan, allSpans])

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto border rounded-lg" ref={containerRef} onKeyDown={handleKeyDown} tabIndex={-1}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left w-1/4">Name</th>
              <th className="px-4 py-2 text-right w-[100px]">Duration</th>
              <th className="px-4 py-2 text-left w-3/4 relative">
                <div className="flex justify-between absolute inset-x-4 top-2">
                  {timeMarkers.map((marker, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-500"
                      style={{
                        position: "absolute",
                        left: `${marker.position}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {marker.label}
                    </div>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSpans.map((span) => {
              const hasChildren = span.children.length > 0
              const isExpanded = expandedSpans.has(span.span_id)
              const isSelected = selectedSpan === span.span_id
              const isFocused = focusedSpanId === span.span_id

              // Calculate position and width for waterfall bar
              const startPosition = ((span.startTime - minTime) / totalDuration) * 100
              const widthPercentage = (span.duration_ms / totalDuration) * 100

              // Determine bar color based on service or status
              const barColor = colorByService
                ? serviceColors[span.service]
                : span.status_code === "Ok" || span.status_code === "200"
                  ? "bg-green-500"
                  : "bg-blue-500"

              return (
                <tr
                  key={span.span_id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(span.span_id, el)
                    else rowRefs.current.delete(span.span_id)
                  }}
                  className={`border-t border-gray-200 hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""} ${
                    isFocused ? "outline outline-2 outline-primary" : ""
                  }`}
                  onClick={() => {
                    setFocusedSpanId(span.span_id)
                    setSelectedSpan(span.span_id)
                  }}
                  tabIndex={0}
                  role="row"
                  aria-selected={isSelected}
                  data-span-id={span.span_id}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <div style={{ width: `${span.level * 20}px` }} />
                      {hasChildren ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpand(span.span_id)
                          }}
                          className="mr-1 p-1 rounded-sm hover:bg-gray-200"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                          tabIndex={-1} // Don't tab to this, use arrow keys instead
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <div className="w-6" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{span.span_name}</span>
                        <span className="text-xs text-gray-500">
                          {span.service} • {span.span_kind}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono whitespace-nowrap">{span.duration_ms}ms</td>
                  <td className="px-4 py-2 relative">
                    <div className="h-6 w-full relative">
                      {/* Render subtle time marker lines */}
                      {timeMarkers.map((marker, index) => (
                        <div
                          key={index}
                          className="absolute top-0 bottom-0 w-px bg-gray-200"
                          style={{ left: `${marker.position}%` }}
                        />
                      ))}
                      <div
                        className={`absolute top-1 h-4 ${barColor} rounded-sm z-10`}
                        style={{
                          left: `${startPosition}%`,
                          width: `${Math.max(0.5, widthPercentage)}%`,
                          opacity: isSelected ? 1 : 0.7,
                        }}
                        title={`${span.span_name}: ${span.duration_ms}ms`}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      
    </div>
  )
}
