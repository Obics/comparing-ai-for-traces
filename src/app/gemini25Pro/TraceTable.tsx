import React, { useState, useMemo } from 'react';
import SpanRow from './SpanRow'; // No changes needed here conceptually

// Helper function to parse timestamp and calculate start/end times in milliseconds
// (Keep the existing getSpanTimings function as it is - no UI changes)
const getSpanTimings = (span) => {
  const startTimeMs = new Date(span.timestamp.replace(' ', 'T') + 'Z').getTime();
  if (isNaN(startTimeMs)) {
      console.error("Invalid timestamp format:", span.timestamp);
      return { startTimeMs: null, endTimeMs: null };
  }
  const durationMs = span.duration_ms || 0;
  const endTimeMs = startTimeMs + durationMs;
  return { startTimeMs, endTimeMs };
};

// Helper function to build the tree and calculate trace boundaries
// (Keep the existing processSpans function as it is - no UI changes)
const processSpans = (spans) => {
  if (!spans || spans.length === 0) {
    return { tree: [], traceStartTime: 0, traceEndTime: 0, traceDuration: 0, spanMap: new Map() };
  }

  let minStartTime = Infinity;
  let maxEndTime = -Infinity;
  const spanMap = new Map();
  const childrenMap = new Map(); // parent_span_id -> [span]

  spans.forEach(span => {
    const { startTimeMs, endTimeMs } = getSpanTimings(span);
    if (startTimeMs === null) return;

    span.startTimeMs = startTimeMs;
    span.endTimeMs = endTimeMs;
    spanMap.set(span.span_id, span);

    if (startTimeMs < minStartTime) minStartTime = startTimeMs;
    if (endTimeMs > maxEndTime) maxEndTime = endTimeMs;

    const parentId = span.parent_span_id || null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId).push(span);
  });

  childrenMap.forEach(children => {
    children.sort((a, b) => a.startTimeMs - b.startTimeMs);
  });

  const traceStartTime = minStartTime;
  const traceEndTime = maxEndTime;
  const traceDuration = traceEndTime - traceStartTime;

  const buildNode = (span) => {
    const children = childrenMap.get(span.span_id) || [];
    return { ...span, children: children.map(buildNode) };
  };

  const rootSpans = childrenMap.get(null) || [];
  const tree = rootSpans.map(buildNode);

  return { tree, traceStartTime, traceEndTime, traceDuration, spanMap };
};


// --- Component Starts Here ---
const TraceTable = ({ spans }) => {
  const [expandedSpans, setExpandedSpans] = useState(new Set());

  const { tree, traceStartTime, traceDuration, spanMap } = useMemo(() => processSpans(spans), [spans]);

  const handleToggleExpand = (spanId) => {
    setExpandedSpans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spanId)) {
        newSet.delete(spanId);
      } else {
        newSet.add(spanId);
      }
      return newSet;
    });
  };

  const renderRows = (spanNodes, level = 0) => {
    let rows = [];
    spanNodes.forEach(node => {
      const isExpanded = expandedSpans.has(node.span_id);
      rows.push(
        <SpanRow
          key={node.span_id}
          span={node}
          level={level}
          traceStartTime={traceStartTime}
          traceDuration={traceDuration}
          hasChildren={node.children && node.children.length > 0}
          isExpanded={isExpanded}
          onToggleExpand={() => handleToggleExpand(node.span_id)}
        />
      );
      if (isExpanded && node.children && node.children.length > 0) {
        rows = rows.concat(renderRows(node.children, level + 1));
      }
    });
    return rows;
  };

  if (!spans || spans.length === 0) {
    return <div className="p-4 text-gray-600">No spans to display.</div>;
  }

   if (traceDuration < 0) {
      return <div className="p-4 text-red-600">Error calculating trace duration. Check timestamps.</div>;
  }

  return (
    // Apply Tailwind classes to the table and header
    <div className="overflow-x-auto"> {/* Optional: Add horizontal scroll on small screens */}
        <table className="min-w-full border-collapse table-fixed text-sm font-sans">
            <thead className="bg-gray-100">
                <tr>
                    {/* Define column widths using Tailwind classes */}
                    <th className="w-5/12 border border-gray-300 p-2 text-left font-bold text-gray-700">Name</th>
                    <th className="w-2/12 border border-gray-300 p-2 text-right font-bold text-gray-700">Duration</th>
                    <th className="w-5/12 border border-gray-300 p-2 text-left font-bold text-gray-700">Waterfall View</th>
                </tr>
            </thead>
            <tbody>
                {renderRows(tree)}
            </tbody>
        </table>
    </div>
  );
};

export default TraceTable;