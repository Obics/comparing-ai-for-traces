import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { FaSquare } from 'react-icons/fa';
// import { stringToColor } from 'src/utils/general-utils';

const WaterfallClaude = ({spans}) => {
  const [traces, setTraces] = useState([]);
  const [expandedSpans, setExpandedSpans] = useState({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [timeMarkers, setTimeMarkers] = useState([]);
  // const [selectedSpanIdInWaterfall, setSelectedSpanIdInWaterfall] = useState(null);
  const [flattenedVisibleSpans, setFlattenedVisibleSpans] = useState([]);
  const tableRef = useRef(null);

  // const selectedSpanIdInWaterfall = useTraceStore((state) => state.selectedSpanIdInWaterfall);
  // const setSelectedSpanIdInWaterfall = useTraceStore((state) => state.setSelectedSpanIdInWaterfall);

  const [selectedSpanIdInWaterfall, setSelectedSpanIdInWaterfall] = useState(null);
  // Sample data
  

  // Helper function to parse timestamp to milliseconds
  const parseTimestamp = (timestamp) => {
    return new Date(timestamp).getTime();
  };

  // Generate time markers
  const generateTimeMarkers = (duration) => {
    const markerCount = 6; // Number of markers including 0 and max
    const markers = [];
    
    for (let i = 0; i < markerCount; i++) {
      const time = Math.round((duration * i) / (markerCount - 1));
      markers.push(time);
    }
    
    return markers;
  };

  // Generate a flattened list of visible spans for keyboard navigation
  const getFlattenedVisibleSpans = useCallback((traceRoot) => {
    if (!traceRoot) return [];
    
    const result = [];
    
    const traverse = (node, level) => {
      result.push({ ...node, level });
      
      if (expandedSpans[node.span_id] && node.children) {
        node.children.forEach(child => traverse(child, level + 1));
      }
    };
    
    traverse(traceRoot, 0);
    return result;
  }, [expandedSpans]);

  // Update flattened visible spans whenever traces or expanded states change
  useEffect(() => {
    if (traces.length > 0) {
      const flattened = getFlattenedVisibleSpans(traces[0]);
      setFlattenedVisibleSpans(flattened);
      
      // If no span is selected yet, select the first one
      if (!selectedSpanIdInWaterfall && flattened.length > 0) {
        setSelectedSpanIdInWaterfall(flattened[0].span_id);
      }
    }
  }, [traces, expandedSpans, getFlattenedVisibleSpans, selectedSpanIdInWaterfall]);

  // Build the trace tree and calculate necessary values
  useEffect(() => {
    // Sort traces by timestamp
    const sortedTraces = [...spans].sort((a, b) => 
      parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );

    // Find root span (no parent_span_id)
    const rootSpan = sortedTraces.find(span => span.parent_span_id === "");
    
    if (!rootSpan) {
      console.error("No root span found");
      return;
    }

    // Find minimum timestamp (start time) and calculate total duration
    const minTime = parseTimestamp(rootSpan.timestamp);
    // setMinTimestamp(minTime);
    setTotalDuration(rootSpan.duration_ms);
    
    // Generate time markers
    setTimeMarkers(generateTimeMarkers(rootSpan.duration_ms));

    // Build tree structure
    const spanMap = {};
    sortedTraces.forEach(span => {
      spanMap[span.span_id] = { 
        ...span, 
        children: [],
        start_time: parseTimestamp(span.timestamp) - minTime,
      };
    });

    // Connect children to parents
    sortedTraces.forEach(span => {
      if (span.parent_span_id && spanMap[span.parent_span_id]) {
        spanMap[span.parent_span_id].children.push(spanMap[span.span_id]);
      }
    });

    // Start with the root node
    const traceTree = spanMap[rootSpan.span_id];

    // Set expanded state for all spans initially
    const initialExpandedState = {};
    sortedTraces.forEach(span => {
      initialExpandedState[span.span_id] = true;
    });
    
    setExpandedSpans(initialExpandedState);
    setTraces([traceTree]);
    setSelectedSpanIdInWaterfall(rootSpan.span_id);
  }, []);

  // Toggle expansion of a span
  const toggleExpand = (spanId) => {
    setExpandedSpans(prev => ({
      ...prev,
      [spanId]: !prev[spanId]
    }));
  };

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e) => {
    if (!selectedSpanIdInWaterfall || flattenedVisibleSpans.length === 0) return;

    const currentIndex = flattenedVisibleSpans.findIndex(span => span.span_id === selectedSpanIdInWaterfall);
    if (currentIndex === -1) return;

    const currentSpan = flattenedVisibleSpans[currentIndex];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < flattenedVisibleSpans.length - 1) {
          setSelectedSpanIdInWaterfall(flattenedVisibleSpans[currentIndex + 1].span_id);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          setSelectedSpanIdInWaterfall(flattenedVisibleSpans[currentIndex - 1].span_id);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Find if current span has children
        // eslint-disable-next-line no-case-declarations
        const hasChildren = currentSpan.children && currentSpan.children.length > 0;
        if (hasChildren && !expandedSpans[currentSpan.span_id]) {
          toggleExpand(currentSpan.span_id);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Collapse if expanded
        if (expandedSpans[currentSpan.span_id]) {
          toggleExpand(currentSpan.span_id);
        } 
        // Otherwise go to parent if not at root level
        else if (currentSpan.parent_span_id) {
          setSelectedSpanIdInWaterfall(currentSpan.parent_span_id);
        }
        break;
      default:
        break;
    }
  }, [selectedSpanIdInWaterfall, flattenedVisibleSpans, expandedSpans]);

  // Add event listener for keyboard navigation
  useEffect(() => {
    const element = document.getElementById('claude-v3-id');
    if (!element) return;
    element.addEventListener('keydown', handleKeyDown);
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Render a span row
  const renderSpan = (span, level = 0) => {
    const isExpanded = expandedSpans[span.span_id];
    const hasChildren = span.children && span.children.length > 0;
    const isSelected = selectedSpanIdInWaterfall === span.span_id;
    
    const leftPosition = (span.start_time / totalDuration) * 100;
    const widthPercentage = (span.duration_ms / totalDuration) * 100;
    
    return (
      <React.Fragment key={span.span_id} >
        <tr 
          className={`border-b border-gray-200 ${isSelected ? 'outline outline-2 outline-blue-500' : 'outline-none'}`}
          onClick={() => setSelectedSpanIdInWaterfall(span.span_id)}
          tabIndex={-1}
          data-span-id={span.span_id}
        >
          <td className="p-2">
            <div className="flex items-center">
              <div style={{ marginLeft: `${level * 20}px` }} className="flex items-center">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(span.span_id);
                    }}
                    className="mr-2 w-4 h-4 text-gray-500 flex items-center justify-center"
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                )}
                {!hasChildren && <div className="w-4 mr-2"></div>}
                <div className='nowrap max-w-[300px] overflow-hidden text-ellipsis'>
                  {/* <span ><FaSquare fill={stringToColor(span.service)} className='inline-block'/></span> */}
                  &nbsp;
                  <span className="text-sm text-gray-500 inline-block">{span.service} • </span>
                  &nbsp;
                  <span className="text-sm">{span.span_name}</span>
                </div>
              </div>
            </div>
          </td>
          <td className="p-2 text-right whitespace-nowrap">
            {span.duration_ms} ms
          </td>
          <td className="p-2 relative">
            <div className="h-6 w-full bg-gray-100 relative">
              <div 
                className="absolute h-6 bg-blue-500 opacity-70"
                style={{ 
                  left: `${leftPosition}%`, 
                  width: `${widthPercentage}%`,
                  minWidth: '2px'
                }}
                title={`${span.span_name} (${span.duration_ms}ms)`}
              ></div>
            </div>
          </td>
        </tr>
        
        {/* Render children if expanded */}
        {isExpanded && hasChildren && 
          span.children.map(child => renderSpan(child, level + 1))
        }
      </React.Fragment>
    );
  };

  // Render time markers for the timeline
  const renderTimeMarkers = () => {
    return (
      <div className="flex w-full justify-between px-2 text-xs text-gray-500">
        {timeMarkers.map((time, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="h-2 w-px bg-gray-300"></div>
            <span>{time} ms</span>
          </div>
        ))}
      </div>
    );
  };

  // Scroll selected row into view when selection changes
  useEffect(() => {
    if (selectedSpanIdInWaterfall) {
      const row = document.querySelector(`[data-span-id="${selectedSpanIdInWaterfall}"]`);
      if (row) {
        // row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedSpanIdInWaterfall]);

  return (
    <div className="w-full max-w-6xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
      
      <div className="overflow-x-auto">
        <table className="w-full" ref={tableRef}>
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left w-1/4">Name</th>
              <th className="p-2 text-right w-24">Duration</th>
              <th className="p-2 w-2/3">
                {renderTimeMarkers()}
              </th>
            </tr>
          </thead>
          <tbody>
            {traces.map(trace => renderSpan(trace))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WaterfallClaude;