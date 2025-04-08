"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

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
}

export const TraceViewer: React.FC<TraceViewerProps> = ({ spans }) => {
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [visibleSpans, setVisibleSpans] = useState<SpanNode[]>([])

  // Build the span tree and calculate timing information
  const { spanTree, minTime, maxTime, allSpans } = useMemo(() => {
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
          spanNode.level = parentSpan.level + 1
        } else {
          // If parent not found, treat as root
          rootSpans.push(spanNode)
        }
      }
    })

    // Sort children by timestamp
    const sortChildren = (node: SpanNode) => {
      node.children.sort((a, b) => a.startTime - b.startTime)
      node.children.forEach(sortChildren)
    }

    rootSpans.sort((a, b) => a.startTime - b.startTime)
    rootSpans.forEach(sortChildren)

    return {
      spanTree: rootSpans,
      minTime,
      maxTime,
      allSpans: Array.from(spanMap.values()),
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
  const toggleExpand = (spanId: string) => {
    setExpandedSpans((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(spanId)) {
        newSet.delete(spanId)
      } else {
        newSet.add(spanId)
      }
      return newSet
    })
  }

  // Calculate the total duration of the trace
  const totalDuration = maxTime - minTime

  // Initialize with root spans expanded
  useEffect(() => {
    const rootIds = spanTree.map((span) => span.span_id)
    setExpandedSpans(new Set(rootIds))
  }, [spanTree])

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-right">Duration</th>
            <th className="px-4 py-2 text-left">Waterfall</th>
          </tr>
        </thead>
        <tbody>
          {visibleSpans.map((span) => {
            const hasChildren = span.children.length > 0
            const isExpanded = expandedSpans.has(span.span_id)

            // Calculate position and width for waterfall bar
            const startPosition = ((span.startTime - minTime) / totalDuration) * 100
            const widthPercentage = (span.duration_ms / totalDuration) * 100

            return (
              <tr key={span.span_id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center">
                    <div style={{ width: `${span.level * 20}px` }} />
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpand(span.span_id)}
                        className="mr-1 p-1 rounded-sm hover:bg-gray-200"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{span.span_name}</span>
                      <span className="text-xs text-gray-500">{span.service}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-mono">{span.duration_ms}ms</td>
                <td className="px-4 py-2 relative">
                  <div className="h-6 w-full relative">
                    <div
                      className="absolute top-1 h-4 bg-blue-500 rounded-sm"
                      style={{
                        left: `${startPosition}%`,
                        width: `${Math.max(0.5, widthPercentage)}%`,
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
  )
}

