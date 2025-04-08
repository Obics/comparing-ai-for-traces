import React, { useState, useMemo, useEffect, useRef } from 'react';

export const TraceViewer = ({ spans }) => {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const tableRef = useRef(null);

  // Process spans into a hierarchical tree and calculate time bounds
  const { rootSpans, minStart, maxEnd } = useMemo(() => {
    const spansMap = {};
    const rootSpans: any[] = [];
    
    spans.forEach((span: { span_id: string | number; }) => {
      spansMap[span.span_id] = { ...span, children: [] };
    });

    spans.forEach((span: { span_id: string | number; parent_span_id: string | number; }) => {
      const current = spansMap[span.span_id];
      const parent = spansMap[span.parent_span_id];
      
      if (parent) {
        parent.children.push(current);
      } else {
        rootSpans.push(current);
      }
    });

    function sortChildren(span: { children: any[]; }) {
      span.children.sort((a: { timestamp: string; }, b: { timestamp: string; }) => 
        Date.parse(a.timestamp) - Date.parse(b.timestamp)
      );
      span.children.forEach(sortChildren);
    }
    rootSpans.forEach(sortChildren);

    let minStart = Infinity;
    let maxEnd = -Infinity;
    spans.forEach((span: { timestamp: string; duration_ms: number; }) => {
      const start = Date.parse(span.timestamp);
      const end = start + span.duration_ms;
      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
    });

    return { rootSpans, minStart, maxEnd };
  }, [spans]);

  const totalDuration = Math.max(maxEnd - minStart, 1);
  const visibleSpans = useMemo(() => {
    const result: any[] = [];
    
    function traverse(span: { span_id: unknown; children: any[]; }, depth: number) {
      result.push({ span, depth });
      if (expandedIds.has(span.span_id)) {
        span.children.forEach((child: any) => traverse(child, depth + 1));
      }
    }
    
    rootSpans.forEach(root => traverse(root, 0));
    return result;
  }, [rootSpans, expandedIds]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: { key: any; preventDefault: () => void; }) => {
      if (!focusedId) return;

      const currentIndex = visibleSpans.findIndex(s => s.span.span_id === focusedId);
      const currentSpan = visibleSpans[currentIndex]?.span;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedId(visibleSpans[currentIndex - 1].span.span_id);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < visibleSpans.length - 1) {
            setFocusedId(visibleSpans[currentIndex + 1].span.span_id);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (currentSpan?.children.length > 0 && !expandedIds.has(currentSpan.span_id)) {
            setExpandedIds(new Set([...expandedIds, currentSpan.span_id]));
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (currentSpan?.children.length > 0 && expandedIds.has(currentSpan.span_id)) {
            const newExpanded = new Set(expandedIds);
            newExpanded.delete(currentSpan.span_id);
            setExpandedIds(newExpanded);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, visibleSpans, expandedIds]);

  // Focus management
  useEffect(() => {
    if (focusedId && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-span-id="${focusedId}"]`);
      row?.focus();
    }
  }, [focusedId]);

  const toggleExpanded = (spanId: unknown) => {
    const newSet = new Set(expandedIds);
    newSet.has(spanId) ? newSet.delete(spanId) : newSet.add(spanId);
    setExpandedIds(newSet);
  };

  const handleRowClick = (spanId: React.SetStateAction<null>) => {
    setSelectedId(spanId);
    setFocusedId(spanId);
  };

  return (
    <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '8px' }}>Duration (ms)</th>
          <th style={{ padding: '8px', width: '40%' }}>
            <div style={{ position: 'relative', height: '30px' }}>
              {[0, 0.25, 0.5, 0.75, 1].map((marker) => {
                const time = Math.round(marker * totalDuration);
                return (
                  <div
                    key={marker}
                    style={{
                      position: 'absolute',
                      left: `${marker * 100}%`,
                      transform: 'translateX(-50%)',
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      fontSize: '0.8em',
                      color: '#666',
                    }}
                  >
                    <div style={{ width: '1px', height: '4px', backgroundColor: '#999' }} />
                    <span>{time}ms</span>
                  </div>
                );
              })}
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {visibleSpans.map(({ span, depth }) => {
          const startTime = Date.parse(span.timestamp);
          const left = ((startTime - minStart) / totalDuration) * 100;
          const width = (span.duration_ms / totalDuration) * 100;
          const hasChildren = span.children.length > 0;
          const isExpanded = expandedIds.has(span.span_id);
          const isSelected = selectedId === span.span_id;
          const isFocused = focusedId === span.span_id;

          return (
            <tr
              key={span.span_id}
              data-span-id={span.span_id}
              tabIndex={0}
              onClick={() => handleRowClick(span.span_id)}
              onFocus={() => setFocusedId(span.span_id)}
              style={{
                borderBottom: '1px solid #eee',
                outline: isFocused ? '2px solid #4a90e2' : 'none',
                outlineOffset: '-2px',
                backgroundColor: isSelected ? '#f5f5f5' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <td style={{ padding: '8px' }}>
                <div style={{ paddingLeft: `${depth * 20}px`, display: 'flex', alignItems: 'center' }}>
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(span.span_id);
                      }}
                      style={{
                        marginRight: '8px',
                        background: 'none',
                        border: '1px solid #666',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: '2px 5px',
                      }}
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                  )}
                  <span>
                    {span.span_name}
                    <div style={{ color: '#666', fontSize: '0.8em' }}>
                      {span.service} • {span.span_kind}
                    </div>
                  </span>
                </div>
              </td>
              <td style={{ padding: '8px' }}>{span.duration_ms}ms</td>
              <td style={{ padding: '8px' }}>
                <div style={{
                  position: 'relative',
                  height: '20px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '3px'
                }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      height: '16px',
                      top: '2px',
                      backgroundColor: '#4a90e2',
                      borderRadius: '2px',
                      transition: 'all 0.2s',
                    }}
                    title={`${span.duration_ms}ms`}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
