import React, { useState, useMemo } from "react";

// Helper to parse "YYYY-MM-DD HH:mm:ss.SSS" into numeric MS
function parseTimestampToMs(timestampString) {
  return new Date(timestampString.replace(" ", "T")).getTime();
}

function buildSpanTree(spans) {
  // Build a map of spans keyed by span_id, attach children
  const spanMap = {};
  spans.forEach(span => {
    span.startTimeMs = parseTimestampToMs(span.timestamp);
    span.children = [];
    spanMap[span.span_id] = span;
  });

  // Identify root spans (those without a valid parent) and attach children
  const roots = [];
  spans.forEach(span => {
    if (span.parent_span_id && spanMap[span.parent_span_id]) {
      spanMap[span.parent_span_id].children.push(span);
    } else {
      roots.push(span);
    }
  });

  return roots;
}

function TraceRow({
  span,
  depth,
  earliestStartMs,
  totalWindowMs,
  toggleExpand,
  expandedMap,
}) {
  const indentPx = depth * 20;
  const hasChildren = span.children && span.children.length > 0;
  const isExpanded = !!expandedMap[span.span_id];

  // Calculate offset for the left edge of the waterfall bar
  const leftPosition = span.startTimeMs - earliestStartMs;
  // The width is just the duration in ms (you can scale if desired)
  const width = span.duration_ms;

  return (
    <>
      <tr>
        {/* NAME COLUMN */}
        <td style={{ textAlign: "left" }}>
          <div style={{ marginLeft: indentPx }}>
            {hasChildren && (
              <span
                onClick={() => toggleExpand(span.span_id)}
                style={{ cursor: "pointer", marginRight: 5 }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            )}
            {/* If no children, just add a spacer for alignment */}
            {!hasChildren && <span style={{ marginLeft: 15 }} />}
            {span.span_name}
          </div>
        </td>

        {/* DURATION COLUMN */}
        <td style={{ textAlign: "left" }}>
          {span.duration_ms} ms
        </td>

        {/* WATERFALL COLUMN */}
        <td style={{ position: "relative", height: 20 }}>
          <div
            style={{
              position: "absolute",
              left: leftPosition,
              width: width,
              top: 5,
              height: 10,
              backgroundColor: "gray",
            }}
            title={`${span.span_name} (${span.duration_ms}ms)`}
          />
        </td>
      </tr>

      {/* Render child rows if expanded */}
      {isExpanded &&
        span.children.map((child) => (
          <TraceRow
            key={child.span_id}
            span={child}
            depth={depth + 1}
            earliestStartMs={earliestStartMs}
            totalWindowMs={totalWindowMs}
            toggleExpand={toggleExpand}
            expandedMap={expandedMap}
          />
        ))}
    </>
  );
}

export default function TraceTable({ spans }) {
  // Build a tree of spans
  const treeData = useMemo(() => buildSpanTree(spans), [spans]);

  // Earliest start time and last finish
  const earliestStartMs = useMemo(() => {
    if (!spans.length) return 0;
    return Math.min(...spans.map((s) => s.startTimeMs));
  }, [spans]);

  const lastFinishMs = useMemo(() => {
    if (!spans.length) return 0;
    return Math.max(...spans.map((s) => s.startTimeMs + s.duration_ms));
  }, [spans]);

  const totalWindowMs = lastFinishMs - earliestStartMs;

  // Expanded rows
  const [expandedMap, setExpandedMap] = useState({});

  const toggleExpand = (spanId) => {
    setExpandedMap((prev) => ({
      ...prev,
      [spanId]: !prev[spanId],
    }));
  };

  // If no spans, nothing to show
  if (!spans.length) {
    return <div>No spans provided</div>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      {/* 
        Use percentages for the first 2 columns so they're relatively small.
        The last <col> has no width => it expands to fill the remaining space.
      */}
      <colgroup>
        <col style={{ width: "15%" }} />
        <col style={{ width: "10%" }} />
        <col />
      </colgroup>

      <thead>
        <tr>
          <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            Name
          </th>
          <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            Duration
          </th>
          {/* Time Markers Header */}
          <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            {/* 
              Show a simple scale from 0ms to totalWindowMs (rounded).
              For more intervals, you could do multiple markers using % steps.
            */}
            <div style={{ position: "relative", height: "20px" }}>
              <span style={{ position: "absolute", left: 0 }}>
                0 ms
              </span>
              <span style={{ position: "absolute", right: 0 }}>
                {totalWindowMs} ms
              </span>
            </div>
          </th>
        </tr>
      </thead>

      <tbody>
        {treeData.map((rootSpan) => (
          <TraceRow
            key={rootSpan.span_id}
            span={rootSpan}
            depth={0}
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
