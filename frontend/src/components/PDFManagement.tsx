'use client';

import { useEffect, useState } from 'react';

interface PDFDocument {
  id: string;
  file_name: string;
  uploaded_at: string;
  expires_at: string;
  processing_status: string;
  extraction_status: string;
  file_size: number;
}

export default function PDFManagement() {
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPDFs() {
      try {
        const response = await fetch('/api/pdfs');
        if (response.ok) {
          const data = await response.json();
          setPdfs(data.pdfs || []);
        }
      } catch (error) {
        console.error('Failed to load PDFs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPDFs();
  }, []);

  function getTimeUntilExpiry(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  function getExpiryStatus(expiresAt: string): { status: string; color: string } {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs <= 0) {
      return { status: 'Expired', color: 'red' };
    }

    if (diffHours < 1) {
      return { status: 'Expires soon', color: 'orange' };
    }

    if (diffHours < 4) {
      return { status: 'Expires soon', color: 'yellow' };
    }

    return { status: 'Active', color: 'green' };
  }

  function getProcessingStatusColor(status: string): string {
    switch (status) {
      case 'ready': return 'green';
      case 'processing': return 'blue';
      case 'extracting': return 'blue';
      case 'generating_questions': return 'blue';
      case 'failed': return 'red';
      case 'expired': return 'gray';
      default: return 'gray';
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-medium text-slate-800">PDF Documents</h2>
        <p className="mt-2 text-sm text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-medium text-slate-800">PDF Documents</h2>
      <p className="mt-2 text-sm text-slate-600">
        Uploaded PDFs expire after 24 hours. Educational content is stored permanently.
      </p>

      {pdfs.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">No PDF documents uploaded yet</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {pdfs.map((pdf) => {
            const { status, color } = getExpiryStatus(pdf.expires_at);
            const timeLeft = getTimeUntilExpiry(pdf.expires_at);
            const statusColor = getProcessingStatusColor(pdf.processing_status);

            return (
              <div key={pdf.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{pdf.file_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs text-${statusColor}-700 bg-${statusColor}-100`}>
                        {pdf.processing_status}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>Uploaded: {new Date(pdf.uploaded_at).toLocaleString()}</p>
                      <p>Size: {(pdf.file_size / (1024 * 1024)).toFixed(2)}MB</p>
                      <p className={`text-${color}-600 font-medium`}>
                        {status}: {timeLeft}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}