import React, { useEffect, useRef, useState } from 'react';

interface A4PreviewContainerProps {
  children: React.ReactNode;
  zoomLevel?: number; // percentage (e.g. 100, 85, 115)
  className?: string;
  minHeight?: number; // target height in px for A4 (default 1123px)
  onScaleChange?: (scale: number) => void;
}

/**
 * A4PreviewContainer:
 * Strictly renders document children inside a fixed A4 canvas (210mm / 794px width x 297mm / 1123px min-height).
 * Automatically applies a CSS transform scale on mobile / smaller viewports so the full A4 document
 * is visible without breaking or shrinking the internal layout.
 */
export const A4PreviewContainer: React.FC<A4PreviewContainerProps> = ({
  children,
  zoomLevel = 100,
  className = '',
  minHeight = 1123,
  onScaleChange
}) => {
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState<number>(1);
  const [renderedHeight, setRenderedHeight] = useState<number>(minHeight);

  // Measure container width and compute responsive scale factor
  useEffect(() => {
    const updateScale = () => {
      if (!outerWrapperRef.current) return;
      const availableWidth = outerWrapperRef.current.clientWidth;
      
      // Standard A4 width in CSS pixels (210mm ≈ 794px at 96 DPI)
      const A4_WIDTH_PX = 794;
      
      // Subtract safety margins for mobile padding (e.g. 16px)
      const targetWidth = Math.max(280, availableWidth - 16);
      
      let baseScale = 1;
      if (availableWidth < A4_WIDTH_PX + 24) {
        baseScale = targetWidth / A4_WIDTH_PX;
      }
      
      // Cap scale between 0.35 (smallest phones) and 1.5
      const clampedScale = Math.max(0.35, Math.min(baseScale, 1.25));
      setAutoScale(clampedScale);

      // Measure actual rendered height of document content to adjust bounding box
      if (contentRef.current) {
        const actualH = Math.max(minHeight, contentRef.current.offsetHeight || minHeight);
        setRenderedHeight(actualH);
      }

      if (onScaleChange) {
        onScaleChange(clampedScale * (zoomLevel / 100));
      }
    };

    updateScale();
    
    // ResizeObserver for robust layout detection
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && outerWrapperRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateScale();
      });
      resizeObserver.observe(outerWrapperRef.current);
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }
    }

    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [minHeight, zoomLevel, onScaleChange]);

  const effectiveScale = autoScale * (zoomLevel / 100);
  const scaledWidth = 794 * effectiveScale;
  const scaledHeight = renderedHeight * effectiveScale;

  return (
    <div 
      ref={outerWrapperRef}
      className={`w-full flex justify-center items-start overflow-x-auto select-text ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Outer bounding box sized to the scaled dimensions to prevent whitespace gaps */}
      <div
        className="transition-all duration-150 relative flex-shrink-0 flex justify-center"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          minHeight: `${scaledHeight}px`,
          overflow: 'visible'
        }}
      >
        {/* Fixed 794px (210mm) A4 Container with transform: scale */}
        <div
          ref={contentRef}
          data-a4-wrapper="true"
          style={{
            width: '794px',
            minWidth: '794px',
            maxWidth: '794px',
            minHeight: `${minHeight}px`,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            boxSizing: 'border-box'
          }}
          className="a4-document-root"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
