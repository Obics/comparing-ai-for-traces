import React from 'react';

const SpanRow = ({
  span,
  level,
  traceStartTime,
  traceDuration,
  hasChildren,
  isExpanded,
  onToggleExpand,
}) => {

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
  const indentation = level * 20; // Calculate indentation in pixels for arbitrary value

  return (
    // Base row styling
    <tr className={`level-${level} hover:bg-gray-50`}>

      {/* Name Column */}
      <td className="border border-gray-300 p-2 align-middle overflow-hidden text-ellipsis whitespace-nowrap">
        {/* Use flex for alignment and apply dynamic padding using arbitrary value */}
        <span className={`flex items-center pl-[${indentation}px]`}>
          {hasChildren && (
            <button
              onClick={onToggleExpand}
              // Style the button with Tailwind
              className="flex-shrink-0 bg-transparent border-none cursor-pointer p-0 mr-1.5 text-xs w-4 leading-none text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
           {!hasChildren && (
             // Spacer for alignment using Tailwind
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
        {/* Container for the waterfall bar */}
        <div className="relative w-full h-4 bg-gray-200 rounded">
          {/* The waterfall bar itself, using arbitrary values for margin-left and width */}
          <div
            className={`absolute top-0 h-full bg-green-500 rounded transition-all duration-150 ease-in-out min-w-[2px] box-border`}
            style={{
                // Use inline styles for dynamic positioning/width based on calculation
                // Tailwind arbitrary values like ml-[...] w-[...] can work too,
                // but inline styles are sometimes clearer for purely dynamic values.
                // Choose the approach you prefer.
                marginLeft: `${offsetPercent}%`,
                width: `${widthPercent}%`,
            }}
            title={`Offset: ${Math.round(span.startTimeMs - traceStartTime)}ms\nDuration: ${span.duration_ms}ms`} // Tooltip
          ></div>
        </div>
      </td>
    </tr>
  );
};

export default SpanRow;