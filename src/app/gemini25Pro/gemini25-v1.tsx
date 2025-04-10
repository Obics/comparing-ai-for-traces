import React, { useState, useMemo, Fragment } from 'react';

// Helper function to build the tree and calculate timing (remains the same)
const processSpans = (spans) => {
    if (!spans || spans.length === 0) {
        return { tree: [], traceStartTime: 0, totalTraceDuration: 0 };
    }

    // 1. Add calculated start/end times (in ms) and initialize children array
    const spansWithTiming = spans.map(span => {
        // Try parsing with 'T' separator, fallback for space
        let startTimeMs;
        try {
            // Append 'Z' if no timezone info is present to assume UTC
            const timestampStr = span.timestamp.includes('Z') ? span.timestamp : span.timestamp.replace(' ', 'T') + 'Z';
            startTimeMs = Date.parse(timestampStr);
            if (isNaN(startTimeMs)) throw new Error("Invalid Date"); // Throw if parsing failed
        } catch (e) {
            console.warn(`Could not parse timestamp: ${span.timestamp}. Using current time as fallback.`);
            startTimeMs = Date.now(); // Fallback or handle error differently
        }

        return {
            ...span,
            startTimeMs,
            endTimeMs: startTimeMs + span.duration_ms,
            children: [], // Initialize children array here
        };
    }).sort((a, b) => a.startTimeMs - b.startTimeMs); // Sort by start time initially

    // 2. Find overall trace start time and end time
    let traceStartTime = spansWithTiming.length > 0 ? spansWithTiming[0].startTimeMs : Date.now();
    let traceEndTime = spansWithTiming.length > 0 ? spansWithTiming[0].endTimeMs : Date.now();


    spansWithTiming.forEach(span => {
        if (span.startTimeMs < traceStartTime) {
            traceStartTime = span.startTimeMs;
        }
        if (span.endTimeMs > traceEndTime) {
            traceEndTime = span.endTimeMs;
        }
    });

    const totalTraceDuration = Math.max(0, traceEndTime - traceStartTime); // Ensure duration is not negative

    // 3. Build the tree structure
    const spanMap = new Map();
    spansWithTiming.forEach(span => {
       span.children = []; // Ensure children array exists on all spans being mapped
       spanMap.set(span.span_id, span);
    });


    const rootSpans = [];
    spansWithTiming.forEach(span => {
        if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
            const parent = spanMap.get(span.parent_span_id);
             if (parent) { // Ensure parent exists
                 // If parent.children wasn't initialized above, do it here (belt and suspenders)
                 // parent.children = parent.children || [];
                 parent.children.push(span);
             } else {
                 // Parent ID exists but not found in map - treat as root or log error
                 console.warn(`Parent span with ID ${span.parent_span_id} not found for span ${span.span_id}. Treating as root.`);
                 rootSpans.push(span);
             }
        } else {
            // It's a root span
            rootSpans.push(span);
        }
    });

    // Optional: Sort children within each parent by start time
    spanMap.forEach(span => { // Iterate map instead of spansWithTiming to ensure children array exists
        if (span.children && span.children.length > 1) {
            span.children.sort((a, b) => a.startTimeMs - b.startTimeMs);
        }
    });

    // Ensure root spans are sorted by start time as well
    rootSpans.sort((a, b) => a.startTimeMs - b.startTimeMs);

    return { tree: rootSpans, traceStartTime, totalTraceDuration };
};


// --- Recursive Row Component (Tailwind - Corrected) ---
const SpanRow = ({
    span,
    depth,
    traceStartTime,
    totalTraceDuration,
    isExpanded,         // Whether THIS row is expanded
    expandedSpans,      // The Set containing ALL expanded span IDs (Passed Down)
    onToggleExpand,
    hasChildren
}) => {

    // Calculate waterfall positioning
    const offsetMs = span.startTimeMs - traceStartTime;
    // Ensure totalTraceDuration is positive to avoid division by zero or negative percentages
    const safeTotalDuration = totalTraceDuration > 0 ? totalTraceDuration : 1;
    const leftPercent = (offsetMs / safeTotalDuration) * 100;
    const widthPercent = (span.duration_ms / safeTotalDuration) * 100;

    const canExpand = hasChildren;

    return (
        <Fragment>
            <tr className={`hover:bg-gray-50/50 dark:hover:bg-slate-700/50`}>
                {/* --- Name Column --- */}
                <td className="border border-gray-200 dark:border-slate-600 p-2 align-middle text-left overflow-hidden text-ellipsis whitespace-nowrap w-[45%]">
                    <span style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center">
                        {canExpand ? (
                            <button
                                onClick={() => onToggleExpand(span.span_id)}
                                className="bg-transparent border-none cursor-pointer p-0 pr-1 mr-1 text-xs text-gray-600 dark:text-gray-300 inline-block min-w-[15px]"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? '▼' : '▶'}
                            </button>
                        ) : (
                           <span className="inline-block w-[15px] mr-1"></span>
                        )}
                        <span className="truncate" title={span.span_name}>{span.span_name}</span>
                         {span.service && (
                           <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">
                             ({span.service})
                           </span>
                         )}
                    </span>
                </td>

                {/* --- Duration Column --- */}
                <td className="border border-gray-200 dark:border-slate-600 p-2 align-middle text-right whitespace-nowrap w-[15%]">
                    {span.duration_ms.toFixed(2)} ms
                </td>

                {/* --- Waterfall Column --- */}
                <td className="border border-gray-200 dark:border-slate-600 p-2 align-middle w-[40%]">
                    <div className="relative w-full h-5 bg-gray-100 dark:bg-slate-700 rounded-sm overflow-hidden">
                        <div
                            className="absolute top-0 h-full min-w-[1px] rounded-sm opacity-80 hover:opacity-100 transition-opacity duration-200 ease-in-out box-border border border-black/10 hover:border-black/30"
                            style={{
                                left: `${Math.max(0, leftPercent)}%`,
                                width: `${Math.max(0.1, Math.min(100 - leftPercent, widthPercent))}%`,
                                backgroundColor: stringToColor(span.service || span.span_name)
                            }}
                            title={`${span.span_name}\nDuration: ${span.duration_ms.toFixed(2)} ms\nStart Offset: ${offsetMs.toFixed(2)} ms`}
                        ></div>
                    </div>
                </td>
            </tr>
            {/* --- Render Children Recursively (Corrected) --- */}
            {/* Only render children if this row (parent) is expanded */}
            {isExpanded && span.children && span.children.map(child => (
                 child.span_id ? (
                    <SpanRow
                        key={child.span_id}
                        span={child}
                        depth={depth + 1}
                        traceStartTime={traceStartTime}
                        totalTraceDuration={totalTraceDuration}
                        // Check if the *child* is in the expanded set
                        isExpanded={expandedSpans.has(child.span_id)}
                        // *** Pass the full expandedSpans Set down ***
                        expandedSpans={expandedSpans}
                        onToggleExpand={onToggleExpand} // Pass the toggle function down
                        hasChildren={child.children && child.children.length > 0}
                    />
                 ) : null
            ))}
        </Fragment>
    );
};


// --- Main Table Component (Tailwind - Corrected) ---
const TraceTable = ({ spans }) => {
    // State for expanded rows (Set is efficient for lookups)
    const [expandedSpans, setExpandedSpans] = useState(new Set());

    // Process spans only when the input `spans` array changes
    const { tree, traceStartTime, totalTraceDuration } = useMemo(() => processSpans(spans || []), [spans]); // Ensure spans is an array

    // Function to toggle the expansion state of a span
    const toggleExpand = (spanId) => {
        setExpandedSpans(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (newExpanded.has(spanId)) {
                newExpanded.delete(spanId);
                // If you want to collapse children when parent collapses:
                // const spansMapForCollapse = new Map();
                // const allSpansForCollapse = spans.map(s => ({...s, children: []})); // Create flat list with children arrays
                // allSpansForCollapse.forEach(s => spansMapForCollapse.set(s.span_id, s));
                // allSpansForCollapse.forEach(s => {
                //      if(s.parent_span_id && spansMapForCollapse.has(s.parent_span_id)) {
                //          spansMapForCollapse.get(s.parent_span_id).children.push(s);
                //      }
                // });
                // const recursiveCollapse = (id) => {
                //    const currentSpan = spansMapForCollapse.get(id);
                //    if (currentSpan && currentSpan.children) {
                //        currentSpan.children.forEach(child => {
                //            newExpanded.delete(child.span_id);
                //            recursiveCollapse(child.span_id);
                //        });
                //    }
                // }
                // recursiveCollapse(spanId);
            } else {
                newExpanded.add(spanId);
            }
            return newExpanded;
        });
    };

     // Initial expansion: Expand the root span(s) by default only once on mount
     useState(() => {
         if (tree.length > 0) {
             const initialExpanded = new Set();
             tree.forEach(rootSpan => {
                 if (rootSpan.span_id) {
                     initialExpanded.add(rootSpan.span_id)
                 }
             });
             // Only update state if it's different to avoid potential loops if tree ref changes unnecessarily
             if (initialExpanded.size > 0 && expandedSpans.size === 0) {
                setExpandedSpans(initialExpanded);
             }
         }
      // Keep dependencies minimal, only run if tree structure fundamentally changes
     }, [tree]);


    if (!spans || spans.length === 0) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">No spans to display.</div>;
    }

     if (totalTraceDuration < 0) {
         return <div className="p-4 text-red-500">Error: Invalid trace timing detected (negative duration). Please check span timestamps and durations.</div>;
     }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed text-sm font-sans dark:text-slate-300">
                <thead className="bg-gray-100 dark:bg-slate-800">
                    <tr>
                        <th className="border border-gray-200 dark:border-slate-600 p-2 font-bold text-left w-[45%]">Name</th>
                        <th className="border border-gray-200 dark:border-slate-600 p-2 font-bold text-right w-[15%]">Duration</th>
                        <th className="border border-gray-200 dark:border-slate-600 p-2 font-bold text-left w-[40%]">
                            Waterfall (Total: {totalTraceDuration.toFixed(2)} ms)
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {tree.map(rootSpan => (
                         rootSpan.span_id ? (
                            <SpanRow
                                key={rootSpan.span_id}
                                span={rootSpan}
                                depth={0}
                                traceStartTime={traceStartTime}
                                totalTraceDuration={totalTraceDuration}
                                isExpanded={expandedSpans.has(rootSpan.span_id)}
                                // *** Pass expandedSpans state down to root rows ***
                                expandedSpans={expandedSpans}
                                onToggleExpand={toggleExpand}
                                hasChildren={rootSpan.children && rootSpan.children.length > 0}
                            />
                          ) : null
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Helper Function for coloring bars (remains the same) ---
function stringToColor(str) {
  if (!str) return '#cccccc'; // Default color for missing strings
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  const h = hash % 360; // Hue (0-359)
  const s = 50 + (hash % 30); // Saturation (50-79) - Avoid overly vibrant colors
  const l = 70 + (hash % 15); // Lightness (70-84) - Keep it light
  return `hsl(${h}, ${s}%, ${l}%)`; // Use HSL for better control
}


export default TraceTable;