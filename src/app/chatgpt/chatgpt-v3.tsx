import React, { useState, useMemo } from "react";

// Helper to convert a "YYYY-MM-DD HH:mm:ss.SSS" string to a numeric timestamp in ms.
function parseTimestampToMs(timestampString) {
  // Replace the space in date-time with 'T' for standard Date parsing
  return new Date(timestampString.replace(" ", "T")).getTime();
}

function buildSpanTree(spans) {
  // Build a lookup table keyed by span_id so we can attach children easily.
  const spanMap = {};
  spans.forEach(span => {
    span.startTimeMs = parseTimestampToMs(span.timestamp);
    span.children = [];
    spanMap[span.span_id] = span;
  });

  // Attach children to their parents, and identify root spans
  const roots = [];
  spans.forEach(span => {
    if (span.parent_span_id && spanMap[span.parent_span_id]) {
      // Parent found, attach
      spanMap[span.parent_span_id].children.push(span);
    } else {
      // No valid parent => root span
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
  const indentPx = depth * 20;
  const hasChildren = span.children && span.children.length > 0;
  const isExpanded = expandedMap[span.span_id] === true;

  // Calculate left offset (px) and width (px) for the waterfall bar
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

      {/* Child rows, rendered if expanded */}
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
  // Convert flat array of spans into a tree
  const treeData = useMemo(() => buildSpanTree(spans), [spans]);

  // Earliest start time and overall time window
  const earliestStartMs = useMemo(() => {
    if (!spans.length) return 0;
    return Math.min(...spans.map(s => parseTimestampToMs(s.timestamp)));
  }, [spans]);

  const lastFinishMs = useMemo(() => {
    if (!spans.length) return 0;
    return Math.max(
      ...spans.map(s => parseTimestampToMs(s.timestamp) + s.duration_ms)
    );
  }, [spans]);

  const totalWindowMs = lastFinishMs - earliestStartMs;

  // Expanded/collapsed state: { [spanId]: bool }
  const [expandedMap, setExpandedMap] = useState({});

  const toggleExpand = spanId => {
    setExpandedMap(prev => ({
      ...prev,
      [spanId]: !prev[spanId]
    }));
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      {/* 
        We specify a colgroup with fixed widths for the first two columns 
        and let the last <col> stretch to fill remaining space.
      */}
      <colgroup>
        <col style={{ width: "200px" }} />
        <col style={{ width: "100px" }} />
        <col />
      </colgroup>

      <thead>
        <tr>
          <th style={{ textAlign: "left", borderBottom: "1px solid black" }}>
            Name
          </th>
          <th style={{ textAlign: "left", borderBottom: "1px solid black" }}>
            Duration
          </th>
          <th style={{ textAlign: "left", borderBottom: "1px solid black" }}>
            Waterfall
          </th>
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
