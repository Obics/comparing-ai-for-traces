/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from "react";

// Helper to convert a "YYYY-MM-DD HH:mm:ss.SSS" string to a numeric timestamp in ms.
function parseTimestampToMs(timestampString: string) {
  // This is a simple approach, you can replace with a library like Date-fns or moment.
  return new Date(timestampString.replace(" ", "T")).getTime();
}

function buildSpanTree(spans: any[]) {
  // Build a lookup table keyed by span_id so we can easily attach children.
  const spanMap = {};
  spans.forEach((span: { startTimeMs: number; timestamp: any; children: never[]; span_id: string | number; }) => {
    // Convert timestamp to numeric ms
    span.startTimeMs = parseTimestampToMs(span.timestamp);
    span.children = [];
    // Track spans by their id
    spanMap[span.span_id] = span;
  });

  // Attach children to parents and track "root" spans
  const roots: any[] = [];
  spans.forEach((span: { parent_span_id: string | number; }) => {
    if (span.parent_span_id && spanMap[span.parent_span_id]) {
      // Parent exists, attach
      spanMap[span.parent_span_id].children.push(span);
    } else {
      // No valid parent => this is a root
      roots.push(span);
    }
  });

  return roots;
}

function TraceRow({ span, depth, offsetMs, earliestStartMs, totalWindowMs, toggleExpand, expandedMap }) {
  const indentPx = depth * 20; // Indentation for child spans

  // Position for the rectangle
  const leftPosition = span.startTimeMs - earliestStartMs;
  const width = span.duration_ms;

  // Percentage-based approach (optional):
  // If you want a 100% width waterfall, you can do: left: (leftPosition / totalWindowMs * 100)%
  // and width: (width / totalWindowMs * 100)%, etc.
  // For simplicity, we do absolute px positioning below.

  const hasChildren = span.children && span.children.length > 0;
  const isExpanded = expandedMap[span.span_id] === true;

  return (
    <>
      <tr>
        {/* NAME */}
        <td>
          <div style={{ marginLeft: indentPx }}>
            {hasChildren && (
              <span
                onClick={() => toggleExpand(span.span_id)}
                style={{ cursor: "pointer", marginRight: "5px" }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            )}
            {!hasChildren && <span style={{ marginLeft: "15px" }} />} 
            {span.span_name}
          </div>
        </td>
        
        {/* DURATION */}
        <td>
          {span.duration_ms} ms
        </td>

        {/* WATERFALL */}
        <td style={{ position: "relative", height: "20px" }}>
          <div
            style={{
              position: "absolute",
              left: leftPosition,    // or left: (leftPosition / 2) if you want to scale down
              width: width,         // or width: (width / 2) if you want to scale
              top: 5,
              height: 10,
              backgroundColor: "gray"
            }}
            title={`${span.span_name} (${span.duration_ms}ms)`}
          />
        </td>
      </tr>
      {/* If expanded, recursively render children */}
      {isExpanded &&
        span.children.map((child: unknown) => (
          <TraceRow
            key={child.span_id}
            span={child}
            depth={depth + 1}
            offsetMs={offsetMs}
            earliestStartMs={earliestStartMs}
            totalWindowMs={totalWindowMs}
            toggleExpand={toggleExpand}
            expandedMap={expandedMap}
          />
        ))}
    </>
  );
}

export function TraceTable({ spans }) {
  // Convert list into a tree
  const treeData = useMemo(() => buildSpanTree(spans), [spans]);

  // Compute earliest start time and overall time window
  const earliestStartMs = useMemo(() => {
    if (spans.length === 0) return 0;
    return Math.min(...spans.map((s: { timestamp: any; }) => parseTimestampToMs(s.timestamp)));
  }, [spans]);

  const lastFinishMs = useMemo(() => {
    if (spans.length === 0) return 0;
    return Math.max(...spans.map((s: { timestamp: any; duration_ms: number; }) => parseTimestampToMs(s.timestamp) + s.duration_ms));
  }, [spans]);
  const totalWindowMs = lastFinishMs - earliestStartMs;

  // Manage which rows are expanded
  const [expandedMap, setExpandedMap] = useState({});

  const toggleExpand = (spanId: string | number) => {
    setExpandedMap((prev) => ({
      ...prev,
      [spanId]: !prev[spanId],
    }));
  };

  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", borderBottom: "1px solid black" }}>Name</th>
          <th style={{ textAlign: "left", borderBottom: "1px solid black" }}>Duration</th>
          <th style={{ textAlign: "left", borderBottom: "1px solid black" }}>Waterfall</th>
        </tr>
      </thead>
      <tbody>
        {treeData.map(rootSpan => (
          <TraceRow
            key={rootSpan.span_id}
            span={rootSpan}
            depth={0}
            offsetMs={0}
            earliestStartMs={earliestStartMs}
            totalWindowMs={totalWindowMs}
            toggleExpand={toggleExpand}
            expandedMap={expandedMap}
          />
        ))}
      </tbody>
    </table>
  );
}
