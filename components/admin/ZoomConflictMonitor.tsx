import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { AlertTriangle, Copy, Link2, Sparkles } from 'lucide-react';
import { Booking, User } from '../../types';
import { Badge, Button, Card } from '../ui/Common';
import { analyzeZoomConflicts, normalizeZoomLink } from '../../utils/zoomConflict';

interface ZoomConflictMonitorProps {
  trainers: User[];
  bookings: Booking[];
  isSupportOnly?: boolean;
}

const STORAGE_KEY = 'nexus_zoom_link_pool';

const parseZoomPoolInput = (input: string) => {
  return Array.from(
    new Set(
      input
        .split(/[\n,]/)
        .map(item => normalizeZoomLink(item))
        .filter(Boolean) as string[]
    )
  );
};

export const ZoomConflictMonitor = ({
  trainers,
  bookings,
  isSupportOnly = false,
}: ZoomConflictMonitorProps) => {
  const [zoomPoolText, setZoomPoolText] = useState('');

  useEffect(() => {
    const fromStorage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : '';
    if (fromStorage) {
      setZoomPoolText(fromStorage);
      return;
    }

    const envPool = (import.meta as any)?.env?.VITE_ZOOM_LINK_POOL as string | undefined;
    if (envPool) {
      setZoomPoolText(envPool.split(',').join('\n'));
    }
  }, []);

  const manualZoomPool = useMemo(() => parseZoomPoolInput(zoomPoolText), [zoomPoolText]);

  const conflictResult = useMemo(() => {
    return analyzeZoomConflicts({
      bookings,
      trainers,
      zoomLinkPool: manualZoomPool,
      rangeStart: new Date(),
      rangeEnd: addDays(new Date(), 14),
    });
  }, [bookings, trainers, manualZoomPool]);

  const handleSavePool = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, zoomPoolText.trim());
    toast.success('Đã lưu Zoom link pool cho dashboard này');
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Đã copy Zoom link');
    } catch {
      toast.error('Không thể copy link');
    }
  };

  return (
    <Card className="p-4 md:p-6 space-y-4 border" style={{ borderColor: '#fdbc94' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#fc5d01' }}>
            <AlertTriangle className="w-5 h-5" />
            Zoom Conflict Monitor
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Phát hiện trùng lịch/trùng Zoom link trong 14 ngày tới và gợi ý link còn trống theo mức ưu tiên trainer.
          </p>
        </div>
        <Badge className="text-xs" style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}>
          {isSupportOnly ? 'Support View' : 'Admin View'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3" style={{ borderColor: '#fdbc94' }}>
          <div className="text-xs text-slate-500">Analyzed bookings</div>
          <div className="text-xl font-bold" style={{ color: '#fc5d01' }}>{conflictResult.analyzedBookings}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: '#fdbc94' }}>
          <div className="text-xs text-slate-500">Concurrent trainer slots</div>
          <div className="text-xl font-bold" style={{ color: '#fc5d01' }}>{conflictResult.concurrentSlots.length}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: '#fdbc94' }}>
          <div className="text-xs text-slate-500">Zoom link conflict/missing</div>
          <div className="text-xl font-bold" style={{ color: '#fc5d01' }}>{conflictResult.zoomLinkConflicts.length}</div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold" style={{ color: '#fc5d01' }}>
          Zoom Link Pool (1 link/line hoặc phân tách dấu phẩy)
        </label>
        <textarea
          className="w-full rounded-lg border p-3 text-sm bg-white focus:outline-none focus:ring-2"
          style={{ borderColor: '#fdbc94' }}
          rows={4}
          value={zoomPoolText}
          onChange={(e) => setZoomPoolText(e.target.value)}
          placeholder="https://us06web.zoom.us/j/123..."
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500">Pool usable links: {manualZoomPool.length}</p>
          <Button size="sm" onClick={handleSavePool} style={{ backgroundColor: '#fc5d01' }}>
            Save Pool
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold" style={{ color: '#fc5d01' }}>Conflict details</h4>
        {conflictResult.zoomLinkConflicts.length === 0 ? (
          <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
            Không phát hiện trùng Zoom link trong 14 ngày tới.
          </div>
        ) : (
          <div className="space-y-2">
            {conflictResult.zoomLinkConflicts.map((item) => (
              <div key={item.bookingId} className="rounded-lg border p-3" style={{ borderColor: '#fedac2' }}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="text-xs" style={{ backgroundColor: '#fedac2', color: '#fc5d01' }}>
                    {item.reason === 'missing_link' ? 'Missing link' : 'Duplicate link'}
                  </Badge>
                  <span className="text-sm font-semibold">{item.trainerName}</span>
                  <span className="text-xs text-slate-500">
                    {format(parseISO(item.startTime), 'dd/MM HH:mm')} - {format(parseISO(item.endTime), 'HH:mm')}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mb-2">
                  Current: {item.currentZoomLink || 'Chưa có link'}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.suggestions.length === 0 ? (
                    <span className="text-xs text-red-600">Không còn link trống trong pool tại khung giờ này.</span>
                  ) : (
                    item.suggestions.map((link) => (
                      <button
                        key={`${item.bookingId}-${link}`}
                        onClick={() => handleCopy(link)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border hover:opacity-90"
                        style={{ borderColor: '#fdbc94', color: '#fc5d01', backgroundColor: '#fff7f2' }}
                        title="Copy link"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span className="max-w-[220px] truncate">{link}</span>
                        <Copy className="w-3 h-3" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-1">
        <Link2 className="w-3 h-3" />
        Ưu tiên gợi ý: preferredZoomLinks của trainer → link chính trainer → link còn trống trong pool.
      </div>
    </Card>
  );
};
