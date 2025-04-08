import React, { useState, useMemo } from "react";

// Helper to convert a "YYYY-MM-DD HH:mm:ss.SSS" string to a numeric timestamp in ms.
function parseTimestampToMs(timestampString) {
  return new Date(timestampString.replace(" ", "T")).getTime();
}

function buildSpanTree(spans) {
  // Build a lookup table keyed by span_id so we can easily attach children.
  const spanMap = {};
  spans.forEach(span => {
    // Convert timestamp to numeric ms
    span.startTimeMs = parseTimestampToMs(span.timestamp);
    span.children = [];
    // Track spans by their id
    spanMap[span.span_id] = span;
  });

  // Attach children to parents and track "root" spans
  const roots = [];
  spans.forEach(span => {
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

function TraceRow({
  span,
  depth,
  earliestStartMs,
  totalWindowMs,
  toggleExpand,
  expandedMap
}) {
  const indentPx = depth * 20; // indentation per depth
  const hasChildren = span.children && span.children.length > 0;
  const isExpanded = expandedMap[span.span_id] === true;

  // Compute left offset and bar width
  const leftPosition = span.startTimeMs - earliestStartMs;
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
            {/* If no children, just provide a spacer for alignment */}
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
              backgroundColor: "gray"
            }}
            title={`${span.span_name} (${span.duration_ms}ms)`}
          />
        </td>
      </tr>

      {/* Child rows */}
      {isExpanded &&
        span.children.map(child => (
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
  // Build tree data
  const treeData = useMemo(() => buildSpanTree(spans), [spans]);

  // Compute earliest start time and total window
  const earliestStartMs = useMemo(() => {
    if (!spans.length) return 0;
    return Math.min(...spans.map(s => parseTimestampToMs(s.timestamp)));
  }, [spans]);
  const lastFinishMs = useMemo(() => {
    if (!spans.length) return 0;
    return Math.max(...spans.map(s => parseTimestampToMs(s.timestamp) + s.duration_ms));
  }, [spans]);
  const totalWindowMs = lastFinishMs - earliestStartMs;

  // Track expanded state for each span
  const [expandedMap, setExpandedMap] = useState({});

  const toggleExpand = (spanId) => {
    setExpandedMap(prev => ({
      ...prev,
      [spanId]: !prev[spanId]
    }));
  };

  return (
    <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
      {/* Define column widths so Name and Duration are fixed, Waterfall takes the remainder */}
      <colgroup>
        <col style={{ width: "200px" }} />
        <col style={{ width: "100px" }} />
        <col style={{ width: "auto" }} />
      </colgroup>

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
