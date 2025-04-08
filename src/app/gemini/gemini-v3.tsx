import React, { useState, useEffect, useRef } from 'react';

const TraceView = ({ spans }) => {
  const [structuredSpans, setStructuredSpans] = useState([]);
  const [expandedSpans, setExpandedSpans] = useState({});
  const [totalDuration, setTotalDuration] = useState(0);
  const [startTimeOffset, setStartTimeOffset] = useState(0);
  const waterfallHeaderRef = useRef(null);
  const [waterfallMarkers, setWaterfallMarkers] = useState([]);

  useEffect(() => {
    if (!spans || spans.length === 0) {
      setStructuredSpans([]);
      setTotalDuration(0);
      setStartTimeOffset(0);
      setWaterfallMarkers([]);
      return;
    }

    // Find the earliest timestamp to calculate relative start times
    const timestamps = spans.map(span => new Date(span.timestamp).getTime());
    const minTimestamp = Math.min(...timestamps);
    setStartTimeOffset(minTimestamp);

    // Calculate the latest timestamp to determine total duration
    const maxTimestamp = Math.max(...timestamps.map(ts => ts + spans.find(s => new Date(s.timestamp).getTime() === ts).duration_ms));
    setTotalDuration(maxTimestamp - minTimestamp);

    // Create a map for quick access to spans by their ID
    const spanMap = new Map(spans.map(span => [span.span_id, { ...span, children: [] }]));

    // Build the tree structure
    const rootSpans = [];
    spanMap.forEach(span => {
      if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
        spanMap.get(span.parent_span_id)?.children.push(span);
      } else {
        rootSpans.push(span);
      }
    });

    // Function to sort children by timestamp
    const sortChildren = (span) => {
      span.children.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      span.children.forEach(sortChildren);
    };

    rootSpans.forEach(sortChildren);

    setStructuredSpans(rootSpans);
  }, [spans]);

  useEffect(() => {
    if (totalDuration > 0 && waterfallHeaderRef.current) {
      const headerWidth = waterfallHeaderRef.current.offsetWidth;
      const numMarkers = Math.min(Math.ceil(totalDuration / 100), 5); // Adjust number of markers as needed
      const markers = [];
      for (let i = 0; i <= numMarkers; i++) {
        const time = Math.round((totalDuration * i) / numMarkers);
        const position = (i / numMarkers) * 100;
        markers.push({ time, position });
      }
      setWaterfallMarkers(markers);
    } else {
      setWaterfallMarkers([]);
    }
  }, [totalDuration, waterfallHeaderRef]);

  const toggleExpand = (spanId) => {
    setExpandedSpans(prev => ({
      ...prev,
      [spanId]: !prev[spanId],
    }));
  };

  const renderWaterfall = (span) => {
    if (totalDuration === 0) {
      return <div style={{ width: '100%', height: '10px', backgroundColor: '#eee' }} />;
    }

    const startTime = new Date(span.timestamp).getTime() - startTimeOffset;
    const endTime = startTime + span.duration_ms;
    const relativeStart = (startTime / totalDuration) * 100;
    const relativeEnd = (endTime / totalDuration) * 100;
    const width = relativeEnd - relativeStart;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${relativeStart}%`,
          width: `${width}%`,
          height: '10px',
          backgroundColor: '#64b5f6',
        }}
      />
    );
  };

  const renderSpans = (spanList, level = 0) => {
    return spanList.map(span => (
      <React.Fragment key={span.span_id}>
        <tr style={{ paddingLeft: `${level * 20}px` }}>
          <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {span.children.length > 0 && (
              <button onClick={() => toggleExpand(span.span_id)}>
                {expandedSpans[span.span_id] ? '-' : '+'}
              </button>
            )}
            {span.span_name}
          </td>
          <td style={{ width: '80px', whiteSpace: 'nowrap' }}>{span.duration_ms} ms</td>
          <td style={{ position: 'relative', height: '20px', backgroundColor: '#f0f0f0' }}>
            {renderWaterfall(span)}
          </td>
        </tr>
        {span.children.length > 0 && expandedSpans[span.span_id] && (
          renderSpans(span.children, level + 1)
        )}
      </React.Fragment>
    ));
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ display: 'grid', gridTemplateColumns: 'auto 80px 1fr' }}>
            <th>Name</th>
            <th style={{ width: '80px' }}>Duration</th>
            <th ref={waterfallHeaderRef} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {waterfallMarkers.map((marker) => (
                  <div
                    key={marker.time}
                    style={{
                      position: 'absolute',
                      left: `calc(${marker.position}% - 1px)`,
                      top: '0px',
                      bottom: '0px',
                      width: '1px',
                      backgroundColor: '#ccc',
                      zIndex: 1,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '-15px',
                        left: '5px',
                        fontSize: '0.8em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {marker.time}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '10px', // Adjust as needed to align with waterfall rows
                    height: '1px',
                    backgroundColor: '#ccc',
                  }}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {renderSpans(structuredSpans)}
        </tbody>
      </table>
    </div>
  );
};

export default TraceView;