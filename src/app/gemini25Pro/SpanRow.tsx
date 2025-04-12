import React from 'react';

const SpanRow = ({
  span,
  level, // This prop indicates the depth in the hierarchy (0 for root, 1 for child, etc.)
  traceStartTime,
  traceDuration,
  hasChildren,
  isExpanded,
  onToggleExpand,
}) => {

  // ... (calculateWaterfallStyle logic remains the same) ...

    // Calculate waterfall bar properties (logic remains the same)
    const calculateWaterfallStyle = () => {
      if (traceDuration <= 0 || span.startTimeMs === null) {
          return { offsetPercent: 0, widthPercent: 0 };
      }
  
      const offsetMs = span.startTimeMs - traceStartTime;
      const offsetPercent = (offsetMs / traceDuration) * 100;
      const widthPercent = (span.duration_ms / traceDuration) * 100;
  
      const clampedOffset = Math.max(0, Math.min(100, offsetPercent));
      // Ensure width doesn't exceed boundary, min width for visibility
      const clampedWidth = Math.max(0.1, Math.min(100 - clampedOffset, widthPercent));
  
      // Return percentages for use in Tailwind arbitrary values
      return {
        offsetPercent: clampedOffset,
        widthPercent: clampedWidth,
      };
    };
    
  const { offsetPercent, widthPercent } = calculateWaterfallStyle();

  // --- Indentation Calculation ---
  // We calculate the indentation amount based on the hierarchy level.
  // Each level adds 20 pixels of indentation.
  const indentation = level * 20; // Example: level 0 = 0px, level 1 = 20px, level 2 = 40px

  return (
    <tr className={`level-${level} hover:bg-gray-50`}>

      {/* Name Column */}
      <td className="border border-gray-300 p-2 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
        {/* --- Applying Indentation --- */}
        {/* This span wraps the button/spacer and the name. */}
        {/* Tailwind's arbitrary value syntax `pl-[...]` applies the calculated padding-left. */}
        <span className={`flex items-center pl-[${indentation}px]`}>
          {hasChildren && (
            <button
              onClick={onToggleExpand}
              className="flex-shrink-0 bg-transparent border-none cursor-pointer p-0 mr-1.5 text-xs w-4 leading-none text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
           {!hasChildren && (
             <span className="inline-block flex-shrink-0 w-4 h-px mr-1.5"></span>
           )}
          {/* Span name */}
          <span className="truncate" title={span.span_name}>{span.span_name}</span>
        </span>
      </td>

      {/* Duration Column */}
      <td className="border border-gray-300 p-2 align-middle text-right text-gray-700">
        {span.duration_ms} ms
      </td>

      {/* Waterfall Column */}
      <td className="border border-gray-300 p-2 align-middle">
        <div className="relative w-full h-4 bg-gray-200 rounded">
          <div
            className={`absolute top-0 h-full bg-green-500 rounded transition-all duration-150 ease-in-out min-w-[2px] box-border`}
            style={{
                marginLeft: `${offsetPercent}%`,
                width: `${widthPercent}%`,
            }}
            title={`Offset: ${Math.round(span.startTimeMs - traceStartTime)}ms\nDuration: ${span.duration_ms}ms`}
          ></div>
        </div>
      </td>
    </tr>
  );
};

export default SpanRow;