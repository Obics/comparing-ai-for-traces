import React, { useState, useMemo, Fragment, useEffect, useCallback, useRef } from 'react';

// processSpans function remains the same...
const processSpans = (spans) => {
    // ... (implementation from previous step) ...
    if (!spans || spans.length === 0) { return { tree: [], traceStartTime: 0, totalTraceDuration: 0 }; }
    const spansWithTiming = spans.map(span => {
        let startTimeMs;
        try {
            const timestampStr = span.timestamp.includes('Z') ? span.timestamp : span.timestamp.replace(' ', 'T') + 'Z';
            startTimeMs = Date.parse(timestampStr);
            if (isNaN(startTimeMs)) throw new Error("Invalid Date");
        } catch (e) { console.warn(`Could not parse timestamp: ${span.timestamp}. Using current time as fallback.`); startTimeMs = Date.now(); }
        return { ...span, startTimeMs, endTimeMs: startTimeMs + span.duration_ms, children: [] };
    }).sort((a, b) => a.startTimeMs - b.startTimeMs);
    let traceStartTime = spansWithTiming.length > 0 ? spansWithTiming[0].startTimeMs : Date.now();
    let traceEndTime = spansWithTiming.length > 0 ? spansWithTiming[0].endTimeMs : Date.now();
    spansWithTiming.forEach(span => {
        if (span.startTimeMs < traceStartTime) traceStartTime = span.startTimeMs;
        if (span.endTimeMs > traceEndTime) traceEndTime = span.endTimeMs;
    });
    const totalTraceDuration = Math.max(0, traceEndTime - traceStartTime);
    const spanMap = new Map();
    spansWithTiming.forEach(span => { span.children = []; spanMap.set(span.span_id, span); });
    const rootSpans = [];
    spansWithTiming.forEach(span => {
        if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
            const parent = spanMap.get(span.parent_span_id);
            if (parent) { parent.children.push(span); }
            else { console.warn(`Parent span ID ${span.parent_span_id} not found for ${span.span_id}. Treating as root.`); rootSpans.push(span); }
        } else { rootSpans.push(span); }
    });
    spanMap.forEach(span => { if (span.children && span.children.length > 1) { span.children.sort((a, b) => a.startTimeMs - b.startTimeMs); } });
    rootSpans.sort((a, b) => a.startTimeMs - b.startTimeMs);
    return { tree: rootSpans, traceStartTime, totalTraceDuration };
};

// --- Helper to get IDs of currently visible rows ---
const getVisibleSpanIds = (nodes, expandedSpans) => {
    let visibleIds = [];
    const traverse = (currentNodes) => {
        if (!currentNodes) return;
        currentNodes.forEach(node => {
            if (node && node.span_id) { // Check node and span_id validity
                visibleIds.push(node.span_id);
                // Only traverse children if the current node is expanded
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
// (Needed for checking children in key handler)
const findSpanInTree = (id, nodes) => {
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


// --- Time Markers Component (remains the same) ---
const TimeMarkers = ({ totalDuration }) => {
    // ... (implementation from previous step) ...
    const numMarkers = 5;
    if (totalDuration <= 0) { return ( <div className="relative w-full h-full flex items-center"><span className="text-xs text-gray-500 dark:text-gray-400 pl-1">0ms</span></div> ); }
    const markers = [];
    for (let i = 0; i <= numMarkers; i++) { const time = (totalDuration / numMarkers) * i; const positionPercent = (time / totalDuration) * 100; markers.push({ time: time, position: positionPercent }); }
    return ( <div className="relative w-full h-full"> {markers.map((marker, index) => ( <span key={index} className="absolute top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap" style={{ left: `${marker.position}%`, transform: `translateY(-50%) translateX(${index === 0 ? '0%' : index === markers.length - 1 ? '-100%' : '-50%'})`, paddingLeft: index === 0 ? '2px' : '0', paddingRight: index === markers.length - 1 ? '2px' : '0', }} > {marker.time.toFixed(0)}ms </span> ))} </div> );
};


// --- Recursive Row Component (Focus/Selection Aware) ---
const SpanRow = ({
    span,
    depth,
    traceStartTime,
    totalTraceDuration,
    isExpanded,
    expandedSpans,
    onToggleExpand, // Keep this for rendering children
    hasChildren,
    // New props for focus/selection
    isFocused,
    onRowClick,
}) => {
    const offsetMs = span.startTimeMs - traceStartTime;
    const safeTotalDuration = totalTraceDuration > 0 ? totalTraceDuration : 1;
    const leftPercent = (offsetMs / safeTotalDuration) * 100;
    const widthPercent = (span.duration_ms / safeTotalDuration) * 100;
    const canExpand = hasChildren;

    return (
        <Fragment>
            {/* Add id, tabIndex, onClick, and conditional focus styling */}
            <tr
                id={`row-${span.span_id}`}
                tabIndex={-1} // Make focusable only programmatically
                onClick={() => onRowClick(span.span_id)}
                className={`focus:outline-none ${ // Base class + remove default outline
                   isFocused
                     ? 'ring-2 ring-inset ring-blue-500 dark:ring-blue-400 bg-blue-100/50 dark:bg-slate-600/60' // Focused state
                     : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/50' // Hover state only when not focused
                 }`}
                 // Optional: Add ARIA attributes for selection state if needed
                 // aria-selected={isFocused}
            >
                {/* --- Name Column (Width: 30%) --- */}
                <td className={`border border-gray-200 dark:border-slate-600 p-2 align-middle text-left overflow-hidden text-ellipsis whitespace-nowrap w-[30%] ${isFocused ? 'border-l-transparent border-t-transparent border-b-transparent' : ''}`}> {/* Hide adjacent borders on focus */}
                    <span style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center">
                        {canExpand ? (
                             // Button should not affect row focus state on click, just toggle
                             <button
                                onClick={(e) => { e.stopPropagation(); onToggleExpand(span.span_id); }}
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
                 {/* Hide adjacent borders on focus */}
                <td className={`border border-gray-200 dark:border-slate-600 p-2 align-middle text-right whitespace-nowrap w-[10%] ${isFocused ? 'border-t-transparent border-b-transparent' : ''}`}>
                    {span.duration_ms.toFixed(2)} ms
                </td>

                {/* --- Waterfall Column (Width: 60%) --- */}
                 {/* Hide adjacent borders on focus */}
                <td className={`border border-gray-200 dark:border-slate-600 p-2 align-middle w-[60%] ${isFocused ? 'border-r-transparent border-t-transparent border-b-transparent' : ''}`}>
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
            {/* Children rendering depends on parent's expanded state */}
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
                        onToggleExpand={onToggleExpand} // Pass down original toggle expand
                        hasChildren={child.children && child.children.length > 0}
                        // Pass focus state and handler down
                        isFocused={focusedRowId === child.span_id} // Check if this child is focused
                        onRowClick={onRowClick} // Pass down the click handler
                        focusedRowId={focusedRowId} // Also pass focusedRowId itself for recursive rendering
                    />
                 ) : null
            ))}
        </Fragment>
    );
};


// --- Main Table Component (Keyboard Navigation Aware) ---
const TraceTable = ({ spans }) => {
    const [expandedSpans, setExpandedSpans] = useState(new Set());
    const [focusedRowId, setFocusedRowId] = useState(null); // Track focused row ID
    const { tree, traceStartTime, totalTraceDuration } = useMemo(() => processSpans(spans || []), [spans]);
    const tableContainerRef = useRef(null); // Ref for the scrollable container/table

    // Calculate the list of currently visible span IDs
    const visibleSpanIds = useMemo(() => {
        return getVisibleSpanIds(tree, expandedSpans);
    }, [tree, expandedSpans]);

    // Set initial focus to the first visible row
    useEffect(() => {
        if (!focusedRowId && visibleSpanIds.length > 0) {
            setFocusedRowId(visibleSpanIds[0]);
        }
        // If the currently focused row disappears (e.g., parent collapsed), focus the first visible row
        else if (focusedRowId && !visibleSpanIds.includes(focusedRowId) && visibleSpanIds.length > 0) {
             setFocusedRowId(visibleSpanIds[0]);
        }
        // If all rows disappear
        else if(visibleSpanIds.length === 0) {
            setFocusedRowId(null);
        }
    }, [visibleSpanIds, focusedRowId]); // Re-run when visible rows change

    // Effect to move focus programmatically when focusedRowId changes
    useEffect(() => {
        if (focusedRowId) {
            const rowElement = document.getElementById(`row-${focusedRowId}`);
            if (rowElement) {
                 // Check if the element is already focused
                 // if (document.activeElement !== rowElement) {
                     rowElement.focus({ preventScroll: true }); // Prevent scroll jump if possible/needed
                 // }

                // Ensure the focused row is visible within the scrollable container
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

            }
        }
    }, [focusedRowId]);

    // Handler to update focused row on click
    const handleRowClick = useCallback((spanId) => {
        setFocusedRowId(spanId);
    }, []);

    // Handler for expand/collapse toggle
    const toggleExpand = useCallback((spanId) => {
        setExpandedSpans(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (newExpanded.has(spanId)) {
                newExpanded.delete(spanId);
                // // Optional: Recursively collapse children if needed
                // const spanMap = new Map(); // Rebuild map if needed for recursive collapse
                // const flatSpans = [];
                // const flatten = (nodes) => nodes.forEach(n => { flatSpans.push(n); if(n.children) flatten(n.children);});
                // flatten(tree);
                // flatSpans.forEach(s => spanMap.set(s.span_id, s));
                // const recursiveCollapse = (id) => {
                //     const currentSpan = spanMap.get(id);
                //     if (currentSpan && currentSpan.children) {
                //         currentSpan.children.forEach(child => {
                //             if (newExpanded.has(child.span_id)) {
                //                  newExpanded.delete(child.span_id);
                //                  recursiveCollapse(child.span_id);
                //             }
                //         });
                //     }
                // }
                // recursiveCollapse(spanId);

            } else {
                newExpanded.add(spanId);
            }
            return newExpanded;
        });
    }, []); // Removed dependency on tree as toggleExpand itself doesn't need it directly

    // Keyboard navigation handler
    const handleKeyDown = useCallback((event) => {
        if (!focusedRowId || visibleSpanIds.length === 0) return; // Need focus and visible rows

        const currentIndex = visibleSpanIds.indexOf(focusedRowId);
        if (currentIndex === -1) return; // Focused item not visible? (Shouldn't happen often)

        let handled = false;

        switch (event.key) {
            case 'ArrowUp': {
                handled = true;
                const nextIndex = Math.max(0, currentIndex - 1);
                setFocusedRowId(visibleSpanIds[nextIndex]);
                break;
            }
            case 'ArrowDown': {
                handled = true;
                const nextIndex = Math.min(visibleSpanIds.length - 1, currentIndex + 1);
                setFocusedRowId(visibleSpanIds[nextIndex]);
                break;
            }
            case 'ArrowRight': {
                const focusedSpanData = findSpanInTree(focusedRowId, tree);
                if (focusedSpanData && focusedSpanData.children && focusedSpanData.children.length > 0 && !expandedSpans.has(focusedRowId)) {
                    handled = true;
                    toggleExpand(focusedRowId); // Expand the row
                }
                break;
            }
            case 'ArrowLeft': {
                 const focusedSpanData = findSpanInTree(focusedRowId, tree);
                 if (focusedSpanData && focusedSpanData.children && focusedSpanData.children.length > 0 && expandedSpans.has(focusedRowId)) {
                    handled = true;
                    toggleExpand(focusedRowId); // Collapse the row
                }
                 // Optional: Navigate to parent if already collapsed/no children? More complex.
                break;
            }
            default:
                break;
        }

        if (handled) {
            event.preventDefault(); // Prevent default arrow key behavior (scrolling)
            event.stopPropagation();
        }
    }, [focusedRowId, visibleSpanIds, expandedSpans, toggleExpand, tree]); // Added tree dependency for findSpanInTree


    if (!spans || spans.length === 0) { return <div className="p-4 text-gray-500 dark:text-gray-400">No spans to display.</div>; }
    if (totalTraceDuration < 0) { return <div className="p-4 text-red-500">Error: Invalid trace timing detected.</div>; }

    return (
        // Add keydown listener to the container
        <div
            className="overflow-x-auto"
            onKeyDown={handleKeyDown}
            ref={tableContainerRef}
            // Add tabIndex to make the container itself focusable if needed,
            // though focus moves to rows. Helps capture keys initially.
            // tabIndex={0}
        >
            <table className="w-full border-collapse table-fixed text-sm font-sans dark:text-slate-300">
                <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10"> {/* Make header sticky */}
                    <tr>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-left w-[30%] align-middle">Name</th>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-right w-[10%] align-middle">Duration</th>
                        <th className="border border-gray-200 dark:border-slate-600 px-2 py-2.5 font-bold text-left w-[60%] align-middle relative">
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
                                expandedSpans={expandedSpans} // Pass set for children rendering check
                                onToggleExpand={toggleExpand} // Pass original toggle handler
                                hasChildren={rootSpan.children && rootSpan.children.length > 0}
                                // Pass focus props
                                isFocused={focusedRowId === rootSpan.span_id}
                                onRowClick={handleRowClick}
                                focusedRowId={focusedRowId} // Pass focusedRowId for recursive rendering checks if needed
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
  // ... (implementation from previous step) ...
  if (!str) return '#cccccc'; let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); hash = hash & hash; } const h = hash % 360; const s = 50 + (hash % 30); const l = 70 + (hash % 15); return `hsl(${h}, ${s}%, ${l}%)`;
}


export default TraceTable;