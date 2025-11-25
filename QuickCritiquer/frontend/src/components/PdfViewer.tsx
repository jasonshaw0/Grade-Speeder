import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  url: string;
  onDownload: () => void;
}

export function PdfViewer({ url, onDownload }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsHovered, setControlsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

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

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const fitToWidth = () => setScale(1.0);
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

  return (
    <div ref={containerRef} className="relative flex-1 h-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Controls overlay - left side vertical */}
      <div
        className={`absolute left-3 top-1/4 -translate-y-1/2 z-20 transition-opacity duration-200 ${
          controlsHovered ? 'opacity-100' : 'opacity-60'
        }`}
        onMouseEnter={() => setControlsHovered(true)}
        onMouseLeave={() => setControlsHovered(false)}
      >
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center py-2 px-1 gap-1">
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
          
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400 py-1 text-center min-w-[36px]">
            {Math.round(scale * 100)}%
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
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 z-30">
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
      <div className="h-full overflow-y-auto overflow-x-auto scroll-area">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
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
                <div className="flex items-center justify-center p-8">
                  <span className="material-symbols-outlined text-[24px] text-slate-400 animate-spin">progress_activity</span>
                </div>
              }
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
