import React, { useState, useMemo, Fragment } from 'react';

// processSpans function remains the same...
const processSpans = (spans) => {
    if (!spans || spans.length === 0) {
        return { tree: [], traceStartTime: 0, totalTraceDuration: 0 };
    }
    const spansWithTiming = spans.map(span => {
        let startTimeMs;
        try {
            const timestampStr = span.timestamp.includes('Z') ? span.timestamp : span.timestamp.replace(' ', 'T') + 'Z';
            startTimeMs = Date.parse(timestampStr);
            if (isNaN(startTimeMs)) throw new Error("Invalid Date");
        } catch (e) {
            console.warn(`Could not parse timestamp: ${span.timestamp}. Using current time as fallback.`);
            startTimeMs = Date.now();
        }
        return {
            ...span,
            startTimeMs,
            endTimeMs: startTimeMs + span.duration_ms,
            children: [],
        };
    }).sort((a, b) => a.startTimeMs - b.startTimeMs);

    let traceStartTime = spansWithTiming.length > 0 ? spansWithTiming[0].startTimeMs : Date.now();
    let traceEndTime = spansWithTiming.length > 0 ? spansWithTiming[0].endTimeMs : Date.now();

    spansWithTiming.forEach(span => {
        if (span.startTimeMs < traceStartTime) traceStartTime = span.startTimeMs;
        if (span.endTimeMs > traceEndTime) traceEndTime = span.endTimeMs;
    });

    const totalTraceDuration = Math.max(0, traceEndTime - traceStartTime);

    const spanMap = new Map();
    spansWithTiming.forEach(span => {
       span.children = [];
       spanMap.set(span.span_id, span);
    });

    const rootSpans = [];
    spansWithTiming.forEach(span => {
        if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
            const parent = spanMap.get(span.parent_span_id);
             if (parent) {
                 parent.children.push(span);
             } else {
                 console.warn(`Parent span with ID ${span.parent_span_id} not found for span ${span.span_id}. Treating as root.`);
                 rootSpans.push(span);
             }
        } else {
            rootSpans.push(span);
        }
    });

    spanMap.forEach(span => {
        if (span.children && span.children.length > 1) {
            span.children.sort((a, b) => a.startTimeMs - b.startTimeMs);
        }
    });
    rootSpans.sort((a, b) => a.startTimeMs - b.startTimeMs);

    return { tree: rootSpans, traceStartTime, totalTraceDuration };
};


// --- Time Markers Component (Revised Layout) ---
const TimeMarkers = ({ totalDuration }) => {
    const numMarkers = 5; // How many markers (intervals + 1)

    if (totalDuration <= 0) {
        // Render simple 0ms if duration is zero or less
        return (
            <div className="relative w-full h-full flex items-center"> {/* Center content vertically */}
                <span className="text-xs text-gray-500 dark:text-gray-400 pl-1">0ms</span>
            </div>
        );
    }

    const markers = [];
    for (let i = 0; i <= numMarkers; i++) {
        const time = (totalDuration / numMarkers) * i;
        const positionPercent = (time / totalDuration) * 100;
        markers.push({
            time: time,
            position: positionPercent,
        });
    }

    return (
        // This container is now relative and takes the height of the parent <th>
        <div className="relative w-full h-full">
            {markers.map((marker, index) => (
                <span
                    key={index}
                    className="absolute top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
                     style={{ left: `${marker.position}%` }}
                     // Horizontal positioning adjustments:
                     // Center intermediate markers, align first left, last right.
                    // Using inline style for transform as Tailwind classes might conflict or be complex
                    // style={{
                    //     left: `${marker.position}%`,
                    //     transform: index === 0 ? 'translateY(-50%)' :
                    //                index === markers.length - 1 ? 'translate(-100%, -50%)' :
                    //                'translate(-50%, -50%)',
                    // }}

                     // Alternative using Tailwind classes for transform (might need tweaking)
                     // Combining conditional classes can be tricky, test this carefully:
                    // className={`... ${
                    //     index === 0 ? 'left-0 translate-x-0' : // Align first marker left edge
                    //     index === markers.length - 1 ? 'left-full -translate-x-full' : // Align last marker right edge
                    //     '-translate-x-1/2' // Center intermediate markers
                    // }`}

                    // Simpler approach: Centering all, slight overflow potential on edges
                    // Adjusted for better edge handling:
                    style={{
                        left: `${marker.position}%`,
                        transform: `translateY(-50%) translateX(${
                            index === 0 ? '0%' : // Align first marker left edge
                            index === markers.length - 1 ? '-100%' : // Align last marker right edge
                            '-50%' // Center intermediate markers
                        })`,
                        // Add small horizontal padding if needed to prevent edge collision
                        paddingLeft: index === 0 ? '2px' : '0',
                        paddingRight: index === markers.length - 1 ? '2px' : '0',
                    }}
                >
                   {marker.time.toFixed(0)}ms
                </span>
            ))}
        </div>
    );
};


// --- Recursive Row Component (No changes needed here) ---
const SpanRow = ({
    span,
    depth,
    traceStartTime,
    totalTraceDuration,
    isExpanded,
    expandedSpans,
    onToggleExpand,
    hasChildren
}) => {
    const offsetMs = span.startTimeMs - traceStartTime;
    const safeTotalDuration = totalTraceDuration > 0 ? totalTraceDuration : 1;
    const leftPercent = (offsetMs / safeTotalDuration) * 100;
    const widthPercent = (span.duration_ms / safeTotalDuration) * 100;
    const canExpand = hasChildren;

    return (
        <Fragment>
            <tr className={`hover:bg-gray-50/50 dark:hover:bg-slate-700/50`}>
                {/* --- Name Column (Width: 30%) --- */}
                <td className="border border-gray-200 dark:border-slate-600 p-2 align-middle text-left overflow-hidden text-ellipsis whitespace-nowrap w-[30%]">
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

                {/* --- Duration Column (Width: 10%) --- */}
                <td className="border border-gray-200 dark:border-slate-600 p-2 align-middle text-right whitespace-nowrap w-[10%]">
                    {span.duration_ms.toFixed(2)} ms
                </td>

                {/* --- Waterfall Column (Width: 60%) --- */}
                <td className="border border-gray-200 dark:border-slate-600 p-2 align-middle w-[60%]">
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
            {/* --- Render Children Recursively --- */}
            {isExpanded && span.children && span.children.map(child => (
                 child.span_id ? (
                    <SpanRow
                        key={child.span_id}
                        span={child}
                        depth={depth + 1}
                        traceStartTime={traceStartTime}
                        totalTraceDuration={totalTraceDuration}
                        isExpanded={expandedSpans.has(child.span_id)}
                        expandedSpans={expandedSpans}
                        onToggleExpand={onToggleExpand}
                        hasChildren={child.children && child.children.length > 0}
                    />
                 ) : null
            ))}
        </Fragment>
    );
};


// --- Main Table Component (Header Padding Adjusted) ---
const TraceTable = ({ spans }) => {
    const [expandedSpans, setExpandedSpans] = useState(new Set());
    const { tree, traceStartTime, totalTraceDuration } = useMemo(() => processSpans(spans || []), [spans]);

    const toggleExpand = (spanId) => {
        setExpandedSpans(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (newExpanded.has(spanId)) newExpanded.delete(spanId);
            else newExpanded.add(spanId);
            return newExpanded;
        });
    };

     useState(() => {
         if (tree.length > 0) {
             const initialExpanded = new Set();
             tree.forEach(rootSpan => { if (rootSpan.span_id) initialExpanded.add(rootSpan.span_id) });
             if (initialExpanded.size > 0 && expandedSpans.size === 0) {
                setExpandedSpans(initialExpanded);
             }
         }
     }, [tree]);


    if (!spans || spans.length === 0) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">No spans to display.</div>;
    }
     if (totalTraceDuration < 0) {
         return <div className="p-4 text-red-500">Error: Invalid trace timing detected.</div>;
     }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed text-sm font-sans dark:text-slate-300">
                <thead className="bg-gray-100 dark:bg-slate-800">
                    <tr>
                        {/* Increased vertical padding slightly: py-2.5 instead of p-2 */}
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-left w-[30%] align-middle">Name</th>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-right w-[10%] align-middle">Duration</th>
                        {/* Increased vertical padding slightly & ensure align-middle */}
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-left w-[60%] align-middle relative"> {/* Added relative for absolute children */}
                            <TimeMarkers totalDuration={totalTraceDuration} />
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
  if (!str) return '#cccccc';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = hash % 360;
  const s = 50 + (hash % 30);
  const l = 70 + (hash % 15);
  return `hsl(${h}, ${s}%, ${l}%)`;
}


export default TraceTable;