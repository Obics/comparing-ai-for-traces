import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

const TraceViewer = ({ spans }) => {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [focusedId, setFocusedId] = useState(null);
  const tableRef = useRef(null);

  // Process spans into a hierarchical tree and calculate time bounds
  const { rootSpans, minStart, maxEnd } = useMemo(() => {
    const spansMap = {};
    const rootSpans = [];
    
    spans.forEach(span => {
      spansMap[span.span_id] = { ...span, children: [] };
    });

    spans.forEach(span => {
      const current = spansMap[span.span_id];
      const parent = spansMap[span.parent_span_id];
      
      if (parent) {
        parent.children.push(current);
      } else {
        rootSpans.push(current);
      }
    });

    function sortChildren(span) {
      span.children.sort((a, b) => 
        Date.parse(a.timestamp) - Date.parse(b.timestamp)
      );
      span.children.forEach(sortChildren);
    }
    rootSpans.forEach(sortChildren);

    let minStart = Infinity;
    let maxEnd = -Infinity;
    spans.forEach(span => {
      const start = Date.parse(span.timestamp);
      const end = start + span.duration_ms;
      minStart = Math.min(minStart, start);
      maxEnd = Math.max(maxEnd, end);
    });

    return { rootSpans, minStart, maxEnd };
  }, [spans]);

  const totalDuration = Math.max(maxEnd - minStart, 1);

  // Generate visible spans list
  const visibleSpans = useMemo(() => {
    const result = [];
    
    function traverse(span, depth) {
      result.push({ span, depth });
      if (expandedIds.has(span.span_id)) {
        span.children.forEach(child => traverse(child, depth + 1));
      }
    }
    
    rootSpans.forEach(root => traverse(root, 0));
    return result;
  }, [rootSpans, expandedIds]);

  // Keyboard navigation (keep this after visibleSpans declaration)
  useEffect(() => {
    const handleKeyDown = (e) => {
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

  // Rest of the component remains the same...
};

export default TraceViewer;