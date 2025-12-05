import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  url: string;
  onDownload: () => void;
  defaultZoom?: 'fit-width' | '75' | '100' | '125' | '150';
}

export function PdfViewer({ url, onDownload, defaultZoom = '100' }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  // Initialize scale from defaultZoom setting
  const getInitialScale = () => {
    switch (defaultZoom) {
      case 'fit-width': return 1.0;
      case '75': return 0.75;
      case '100': return 1.0;
      case '125': return 1.25;
      case '150': return 1.5;
      default: return 1.0;
    }
  };
  const [scale, setScale] = useState(getInitialScale);
  // Visual scale for smooth CSS transitions during scroll zoom
  const [visualScale, setVisualScale] = useState(getInitialScale);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsHovered, setControlsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [isZooming, setIsZooming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const zoomTimeoutRef = useRef<number | null>(null);
  const scaleUpdateTimeoutRef = useRef<number | null>(null);

  // Track container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message || 'Failed to load PDF');
    setLoading(false);
  }, []);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, numPages)));
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3);
    setScale(newScale);
    setVisualScale(newScale);
  };
  const zoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    setVisualScale(newScale);
  };
  const fitToWidth = () => {
    setScale(1.0);
    setVisualScale(1.0);
  };
  const rotate = () => setRotation((r) => (r + 90) % 360);

  // Scroll to current page when it changes
  useEffect(() => {
    const pageEl = document.querySelector(`[data-page-number="${currentPage}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);

  // Calculate page width based on container and scale
  const pageWidth = Math.min(containerWidth - 80, 900) * scale;

  // Handle scroll wheel zoom with smooth CSS transform
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only zoom if Ctrl/Cmd is held
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.03 : 0.03;

      setVisualScale((s) => {
        const newScale = Math.max(0.5, Math.min(3, s + delta));

        // Debounce the actual scale update to reduce re-renders
        if (scaleUpdateTimeoutRef.current) {
          clearTimeout(scaleUpdateTimeoutRef.current);
        }
        scaleUpdateTimeoutRef.current = window.setTimeout(() => {
          setScale(newScale);
        }, 150);

        return newScale;
      });

      // Show zoom indicator
      setIsZooming(true);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = window.setTimeout(() => {
        setIsZooming(false);
      }, 400);
    }
  }, []);

  // Attach wheel listener to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      if (scaleUpdateTimeoutRef.current) {
        clearTimeout(scaleUpdateTimeoutRef.current);
      }
    };
  }, [handleWheel]);

  // Calculate transform scale relative to the rendered scale
  const transformScale = scale > 0 ? visualScale / scale : 1;

  return (
    <div ref={containerRef} className="relative flex-1 h-full flex flex-col overflow-hidden bg-slate-200 dark:bg-slate-900">
      {/* Controls overlay - left side vertical */}
      <div
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 transition-opacity duration-200 ${controlsHovered ? 'opacity-100' : 'opacity-60'
          }`}
        onMouseEnter={() => setControlsHovered(true)}
        onMouseLeave={() => setControlsHovered(false)}
      >
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center py-2 px-1 gap-1">
          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition mb-1"
            title={collapsed ? "Expand toolbar" : "Collapse toolbar"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {collapsed ? 'expand_content' : 'collapse_content'}
            </span>
          </button>

          {!collapsed && (
            <>
              {/* Page navigation */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Previous page"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
              </button>

              <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400 py-1 text-center min-w-[36px]">
                {currentPage}/{numPages || '?'}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Next page"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
              </button>

              <div className="w-6 h-px bg-slate-200 dark:bg-slate-700 my-1" />

              {/* Zoom controls */}
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Zoom out"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>

              <div className={`text-[10px] font-medium py-1 text-center min-w-[36px] rounded transition-all duration-200 ${isZooming ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-600 dark:text-slate-400'}`}>
                {Math.round(visualScale * 100)}%
              </div>

              <button
                onClick={zoomIn}
                disabled={scale >= 3}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Zoom in"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>

              <button
                onClick={fitToWidth}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Fit to width"
              >
                <span className="material-symbols-outlined text-[18px]">fit_width</span>
              </button>

              <div className="w-6 h-px bg-slate-200 dark:bg-slate-700 my-1" />

              {/* Rotate */}
              <button
                onClick={rotate}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Rotate"
              >
                <span className="material-symbols-outlined text-[18px]">rotate_right</span>
              </button>

              {/* Download */}
              <button
                onClick={onDownload}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Download"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </>
          )}

          {/* Collapsed State: Show minimal controls */}
          {collapsed && (
            <>
              <div className="w-6 h-px bg-slate-200 dark:bg-slate-700 my-1" />
              <div className="flex flex-col items-center gap-1">
                <input
                  type="text"
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) goToPage(val);
                  }}
                  className="w-8 text-center text-[10px] bg-slate-100 dark:bg-slate-700 rounded border-none outline-none py-1"
                />
                <div className="flex gap-0.5">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[14px]">keyboard_arrow_up</span>
                  </button>
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30">
                    <span className="material-symbols-outlined text-[14px]">keyboard_arrow_down</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 dark:bg-slate-900/80 z-30">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-blue-500 animate-spin">progress_activity</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">Loading PDF...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="flex flex-col items-center gap-2 text-rose-500">
            <span className="material-symbols-outlined text-[32px]">error</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* PDF Document */}
      <div className="h-full overflow-y-auto overflow-x-auto scroll-area bg-slate-300/50 dark:bg-slate-800/50">
        <div
          style={{
            transform: `scale(${transformScale})`,
            transformOrigin: 'top center',
            transition: isZooming ? 'transform 0.1s ease-out' : 'transform 0.15s ease-out',
            opacity: isZooming ? 0 : 1
          }}
        >
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-[600px] h-[800px] bg-white dark:bg-slate-800 animate-pulse shadow-lg rounded-sm" />
              </div>
            }
            className="flex flex-col items-center py-2"
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={pageWidth}
                rotate={rotation}
                className="mb-2 shadow-md"
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div
                    className="bg-white dark:bg-slate-800 animate-pulse shadow-md mb-2"
                    style={{ width: pageWidth, height: pageWidth * 1.414 }}
                  />
                }
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}

// Default export for React.lazy() compatibility
export default PdfViewer;
