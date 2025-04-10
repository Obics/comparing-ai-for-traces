import React, { useState, useMemo, Fragment, useEffect, useCallback, useRef } from 'react';

// ========================================================================
// Helper Functions (Define BEFORE components that use them)
// ========================================================================

// --- Function to process raw spans into a tree structure ---
const processSpans = (spans) => {
    if (!spans || spans.length === 0) {
        return { tree: [], traceStartTime: 0, totalTraceDuration: 0 };
    }
    // Add calculated start/end times (in ms) and initialize children array
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
            children: [], // Initialize children array here
        };
    }).sort((a, b) => a.startTimeMs - b.startTimeMs);

    // Find overall trace start time and end time
    let traceStartTime = spansWithTiming.length > 0 ? spansWithTiming[0].startTimeMs : Date.now();
    let traceEndTime = spansWithTiming.length > 0 ? spansWithTiming[0].endTimeMs : Date.now();
    spansWithTiming.forEach(span => {
        if (span.startTimeMs < traceStartTime) traceStartTime = span.startTimeMs;
        if (span.endTimeMs > traceEndTime) traceEndTime = span.endTimeMs;
    });
    const totalTraceDuration = Math.max(0, traceEndTime - traceStartTime);

    // Build the tree structure
    const spanMap = new Map();
    spansWithTiming.forEach(span => {
       span.children = []; // Ensure children array exists on all spans being mapped
       spanMap.set(span.span_id, span);
    });
    const rootSpans = [];
    spansWithTiming.forEach(span => {
        if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
            const parent = spanMap.get(span.parent_span_id);
             if (parent) {
                 parent.children.push(span);
             } else {
                 console.warn(`Parent span ID ${span.parent_span_id} not found for ${span.span_id}. Treating as root.`);
                 rootSpans.push(span);
             }
        } else {
            rootSpans.push(span);
        }
    });

    // Sort children within each parent by start time
    spanMap.forEach(span => {
        if (span.children && span.children.length > 1) {
            span.children.sort((a, b) => a.startTimeMs - b.startTimeMs);
        }
    });
    rootSpans.sort((a, b) => a.startTimeMs - b.startTimeMs);

    return { tree: rootSpans, traceStartTime, totalTraceDuration };
};

// --- Helper to get IDs of currently visible rows ---
const getVisibleSpanIds = (nodes, expandedSpans) => {
    let visibleIds = [];
    const traverse = (currentNodes) => {
        if (!currentNodes) return;
        currentNodes.forEach(node => {
            if (node && node.span_id) {
                visibleIds.push(node.span_id);
                if (expandedSpans.has(node.span_id) && node.children && node.children.length > 0) {
                    traverse(node.children);
                }
            }
        });
    };
    traverse(nodes);
    return visibleIds;
};

// --- Helper to get span data by ID from the tree ---
const findSpanInTree = (id, nodes) => {
    if (!nodes) return null;
    for (const node of nodes) {
        if (!node) continue;
        if (node.span_id === id) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findSpanInTree(id, node.children);
            if (found) return found;
        }
    }
    return null;
};

// --- Helper Function for coloring bars ---
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

// ========================================================================
// React Components
// ========================================================================

// --- Time Markers Component ---
const TimeMarkers = ({ totalDuration }) => {
    const numMarkers = 5; // How many markers (intervals + 1)
    if (totalDuration <= 0) { return ( <div className="relative w-full h-full flex items-center"><span className="text-xs text-gray-500 dark:text-gray-400 pl-1">0ms</span></div> ); }
    const markers = [];
    for (let i = 0; i <= numMarkers; i++) { const time = (totalDuration / numMarkers) * i; const positionPercent = (time / totalDuration) * 100; markers.push({ time: time, position: positionPercent }); }
    return (
        <div className="relative w-full h-full">
            {markers.map((marker, index) => (
                <span
                    key={index}
                    className="absolute top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    style={{
                        left: `${marker.position}%`,
                        transform: `translateY(-50%) translateX(${index === 0 ? '0%' : index === markers.length - 1 ? '-100%' : '-50%'})`,
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

// --- Recursive Row Component ---
const SpanRow = ({
    span,
    depth,
    traceStartTime,
    totalTraceDuration,
    isExpanded,
    expandedSpans,
    onToggleExpand,
    hasChildren,
    isFocused,
    onRowClick,
    focusedRowId, // Ensure this is destructured
}) => {
    const offsetMs = span.startTimeMs - traceStartTime;
    const safeTotalDuration = totalTraceDuration > 0 ? totalTraceDuration : 1;
    const leftPercent = (offsetMs / safeTotalDuration) * 100;
    const widthPercent = (span.duration_ms / safeTotalDuration) * 100;
    const canExpand = hasChildren;

    return (
        <Fragment>
            <tr
                id={`row-${span.span_id}`}
                tabIndex={-1}
                onClick={() => onRowClick(span.span_id)}
                className={`focus:outline-none ${
                   isFocused
                     ? 'ring-2 ring-inset ring-blue-500 dark:ring-blue-400 bg-blue-100/50 dark:bg-slate-600/60'
                     : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/50'
                 }`}
            >
                {/* Name Column */}
                <td className={`border border-gray-200 dark:border-slate-600 p-2 align-middle text-left overflow-hidden text-ellipsis whitespace-nowrap w-[30%] ${isFocused ? 'border-l-transparent border-t-transparent border-b-transparent' : ''}`}>
                    <span style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center">
                        {canExpand ? (
                             <button
                                onClick={(e) => { e.stopPropagation(); onToggleExpand(span.span_id); }}
                                className="bg-transparent border-none cursor-pointer p-0 pr-1 mr-1 text-xs text-gray-600 dark:text-gray-300 inline-block min-w-[15px]"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "Collapse" : "Expand"} > {isExpanded ? '▼' : '▶'} </button>
                        ) : ( <span className="inline-block w-[15px] mr-1"></span> )}
                        <span className="truncate" title={span.span_name}>{span.span_name}</span>
                         {span.service && ( <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">({span.service})</span> )}
                    </span>
                </td>
                {/* Duration Column */}
                <td className={`border border-gray-200 dark:border-slate-600 p-2 align-middle text-right whitespace-nowrap w-[10%] ${isFocused ? 'border-t-transparent border-b-transparent' : ''}`}>
                    {span.duration_ms.toFixed(2)} ms
                </td>
                {/* Waterfall Column */}
                <td className={`border border-gray-200 dark:border-slate-600 p-2 align-middle w-[60%] ${isFocused ? 'border-r-transparent border-t-transparent border-b-transparent' : ''}`}>
                    <div className="relative w-full h-5 bg-gray-100 dark:bg-slate-700 rounded-sm overflow-hidden"> {/* Track */}
                         <div className="absolute top-0 h-full min-w-[1px] rounded-sm opacity-80 hover:opacity-100 transition-opacity duration-200 ease-in-out box-border border border-black/10 hover:border-black/30"
                            style={{ left: `${Math.max(0, leftPercent)}%`, width: `${Math.max(0.1, Math.min(100 - leftPercent, widthPercent))}%`, backgroundColor: stringToColor(span.service || span.span_name) }}
                            title={`${span.span_name}\nDuration: ${span.duration_ms.toFixed(2)} ms\nStart Offset: ${offsetMs.toFixed(2)} ms`} ></div> {/* Bar */}
                    </div>
                </td>
            </tr>
            {/* Render Children */}
            {isExpanded && span.children && span.children.map(child => (
                 child?.span_id ? ( <SpanRow key={child.span_id} span={child} depth={depth + 1} traceStartTime={traceStartTime} totalTraceDuration={totalTraceDuration} isExpanded={expandedSpans.has(child.span_id)} expandedSpans={expandedSpans} onToggleExpand={onToggleExpand} hasChildren={child.children && child.children.length > 0} isFocused={focusedRowId === child.span_id} onRowClick={onRowClick} focusedRowId={focusedRowId} /> ) : null
            ))}
        </Fragment>
    );
};


// --- Main Table Component ---
const TraceTable = ({ spans }) => {
    const [expandedSpans, setExpandedSpans] = useState(new Set());
    const [focusedRowId, setFocusedRowId] = useState(null);
    const tableContainerRef = useRef(null);

    // *** Use processSpans here (it's defined above now) ***
    const { tree, traceStartTime, totalTraceDuration } = useMemo(() => processSpans(spans || []), [spans]);

    const visibleSpanIds = useMemo(() => getVisibleSpanIds(tree, expandedSpans), [tree, expandedSpans]);

    // Effect for initial focus / focus loss handling
    useEffect(() => {
        if (!focusedRowId && visibleSpanIds.length > 0) { setFocusedRowId(visibleSpanIds[0]); }
        else if (focusedRowId && !visibleSpanIds.includes(focusedRowId) && visibleSpanIds.length > 0) { setFocusedRowId(visibleSpanIds[0]); }
        else if(visibleSpanIds.length === 0) { setFocusedRowId(null); }
    }, [visibleSpanIds, focusedRowId]);

    // Effect for moving focus programmatically
    useEffect(() => {
        if (focusedRowId) {
            const rowElement = document.getElementById(`row-${focusedRowId}`);
            if (rowElement) {
                rowElement.focus({ preventScroll: true });
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    }, [focusedRowId]);

    // Click handler
    const handleRowClick = useCallback((spanId) => { setFocusedRowId(spanId); }, []);

    // Expand/collapse handler
    const toggleExpand = useCallback((spanId) => {
        setExpandedSpans(prev => { const next = new Set(prev); if (next.has(spanId)) next.delete(spanId); else next.add(spanId); return next; });
    }, []);

    // Keyboard handler
    const handleKeyDown = useCallback((event) => {
        if (!focusedRowId || visibleSpanIds.length === 0) return;
        const currentIndex = visibleSpanIds.indexOf(focusedRowId);
        if (currentIndex === -1) return;

        let handled = false;
        const focusedSpanData = findSpanInTree(focusedRowId, tree);

        switch (event.key) {
            case 'ArrowUp': { handled = true; setFocusedRowId(visibleSpanIds[Math.max(0, currentIndex - 1)]); break; }
            case 'ArrowDown': { handled = true; setFocusedRowId(visibleSpanIds[Math.min(visibleSpanIds.length - 1, currentIndex + 1)]); break; }
            case 'ArrowRight': { if (focusedSpanData?.children?.length > 0 && !expandedSpans.has(focusedRowId)) { handled = true; toggleExpand(focusedRowId); } break; }
            case 'ArrowLeft': { if (focusedSpanData?.children?.length > 0 && expandedSpans.has(focusedRowId)) { handled = true; toggleExpand(focusedRowId); } break; }
            default: break;
        }

        if (handled) { event.preventDefault(); event.stopPropagation(); }
    }, [focusedRowId, visibleSpanIds, expandedSpans, toggleExpand, tree]);


    // Render logic
    if (!spans || spans.length === 0) { return <div className="p-4 text-gray-500 dark:text-gray-400">No spans to display.</div>; }
    if (totalTraceDuration < 0) { return <div className="p-4 text-red-500">Error: Invalid trace timing detected.</div>; }

    return (
        <div className="overflow-x-auto" onKeyDown={handleKeyDown} ref={tableContainerRef} >
            <table className="w-full border-collapse table-fixed text-sm font-sans dark:text-slate-300">
                <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-left w-[30%] align-middle">Name</th>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-right w-[10%] align-middle">Duration</th>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-left w-[60%] align-middle relative"> <TimeMarkers totalDuration={totalTraceDuration} /> </th>
                    </tr>
                </thead>
                <tbody>
                    {tree.map(rootSpan => (
                         rootSpan?.span_id ? ( <SpanRow key={rootSpan.span_id} span={rootSpan} depth={0} traceStartTime={traceStartTime} totalTraceDuration={totalTraceDuration} isExpanded={expandedSpans.has(rootSpan.span_id)} expandedSpans={expandedSpans} onToggleExpand={toggleExpand} hasChildren={rootSpan.children && rootSpan.children.length > 0} isFocused={focusedRowId === rootSpan.span_id} onRowClick={handleRowClick} focusedRowId={focusedRowId} /> ) : null
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TraceTable;