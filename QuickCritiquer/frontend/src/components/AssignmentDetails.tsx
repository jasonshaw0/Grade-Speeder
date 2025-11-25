import { useEffect, useState } from 'react';

interface RubricRating {
  id: string;
  description: string;
  points: number;
}

interface RubricCriterion {
  id: string;
  description: string;
  points: number;
  ratings?: RubricRating[];
}

interface AssignmentDetailsData {
  id: number;
  name: string;
  description: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  rubric: RubricCriterion[] | null;
  submissionTypes: string[];
}

interface Props {
  baseUrl: string;
  courseId: number | null;
  assignmentId: number | null;
  assignmentName?: string;
}

// API base for proxied requests
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function AssignmentDetails({ baseUrl, courseId, assignmentId, assignmentName }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<AssignmentDetailsData | null>(null);

  // Construct the assignment URL for "Open in Canvas" link
  const assignmentUrl = baseUrl && courseId && assignmentId
    ? `${baseUrl}/courses/${courseId}/assignments/${assignmentId}`
    : null;

  // Fetch assignment details through the backend proxy
  useEffect(() => {
    if (!courseId || !assignmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/assignment-details`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch assignment details');
        }
        const data = await res.json();
        setDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load assignment details:', err);
        setError('Could not load assignment details. Click below to view in Canvas.');
        setLoading(false);
      });
  }, [courseId, assignmentId]);

  if (!assignmentUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
        <span className="material-symbols-outlined text-[48px] mb-2">assignment</span>
        <span className="text-sm">No assignment selected</span>
        <span className="text-xs mt-1">Select an assignment to view its details</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Header info */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-500">assignment</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {assignmentName || details?.name || 'Assignment Details'}
            </span>
          </div>
          <a
            href={assignmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            <span>Open in Canvas</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-blue-500 animate-spin">progress_activity</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">Loading assignment details...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-md text-center">
            <span className="material-symbols-outlined text-[32px] text-amber-500 mb-2">warning</span>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">{error}</p>
            <a
              href={assignmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 hover:bg-blue-600 text-white transition"
            >
              <span>Open in Canvas</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>
      )}

      {/* Assignment content */}
      {details && !loading && !error && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Assignment metadata */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                {details.pointsPossible && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">grade</span>
                    <span className="text-slate-600 dark:text-slate-400">Points:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{details.pointsPossible}</span>
                  </div>
                )}
                {details.dueAt && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">schedule</span>
                    <span className="text-slate-600 dark:text-slate-400">Due:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(details.dueAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {details.submissionTypes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">upload_file</span>
                    <span className="text-slate-600 dark:text-slate-400">Submit:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {details.submissionTypes.map(t => t.replace(/_/g, ' ')).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description/Instructions */}
            {details.description && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-500">description</span>
                  Instructions
                </h3>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none
                    prose-headings:text-slate-800 dark:prose-headings:text-slate-200
                    prose-p:text-slate-700 dark:prose-p:text-slate-300
                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-slate-800 dark:prose-strong:text-slate-200
                    prose-ul:text-slate-700 dark:prose-ul:text-slate-300
                    prose-ol:text-slate-700 dark:prose-ol:text-slate-300
                    prose-li:text-slate-700 dark:prose-li:text-slate-300
                    prose-table:text-slate-700 dark:prose-table:text-slate-300
                    prose-th:bg-slate-100 dark:prose-th:bg-slate-800
                    prose-td:border-slate-200 dark:prose-td:border-slate-700
                    prose-img:rounded-lg prose-img:shadow-sm"
                  dangerouslySetInnerHTML={{ __html: details.description }}
                  onClick={(e) => {
                    // Handle file download links - open in new tab
                    const target = e.target as HTMLElement;
                    const link = target.closest('a');
                    if (link && link.href) {
                      e.preventDefault();
                      window.open(link.href, '_blank');
                    }
                  }}
                />
              </div>
            )}

            {/* Rubric */}
            {details.rubric && details.rubric.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-500">rubric</span>
                  Rubric
                </h3>
                <div className="space-y-3">
                  {details.rubric.map((criterion) => (
                    <div key={criterion.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {criterion.description}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {criterion.points} pts
                        </span>
                      </div>
                      {criterion.ratings && criterion.ratings.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700">
                          {criterion.ratings.map((rating) => (
                            <div 
                              key={rating.id} 
                              className="bg-white dark:bg-slate-800 px-3 py-2"
                            >
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                                {rating.points} pts
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {rating.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No content message */}
            {!details.description && (!details.rubric || details.rubric.length === 0) && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-slate-400 mb-2">info</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No instructions or rubric available for this assignment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
