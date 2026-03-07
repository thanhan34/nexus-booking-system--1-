import { Booking, User } from '../types';

interface EnrichedBooking {
  booking: Booking;
  trainer?: User;
  normalizedZoomLink?: string;
  start: Date;
  end: Date;
}

export interface TrainerTimeConflict {
  startTime: string;
  endTime: string;
  bookingIds: string[];
  trainerIds: string[];
}

export interface ZoomConflictSuggestion {
  bookingId: string;
  trainerId: string;
  trainerName: string;
  startTime: string;
  endTime: string;
  currentZoomLink?: string;
  reason: 'missing_link' | 'link_conflict';
  conflictWithBookingIds: string[];
  suggestions: string[];
}

export interface ZoomConflictResult {
  analyzedBookings: number;
  allZoomLinks: string[];
  concurrentSlots: TrainerTimeConflict[];
  zoomLinkConflicts: ZoomConflictSuggestion[];
}

export const normalizeZoomLink = (raw?: string): string | undefined => {
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const firstUrl = trimmed.match(/https?:\/\/[^\s]+/i)?.[0] || trimmed;

  try {
    const url = new URL(firstUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, '');

    return `${url.protocol}//${hostname}${pathname}`;
  } catch {
    return firstUrl.toLowerCase().replace(/\/+$/, '');
  }
};

const hasTimeOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  return aStart < bEnd && bStart < aEnd;
};

const toUniqueLinks = (links: Array<string | undefined>) => {
  return Array.from(new Set(links.filter(Boolean) as string[]));
};

export const analyzeZoomConflicts = ({
  bookings,
  trainers,
  zoomLinkPool,
  rangeStart,
  rangeEnd,
}: {
  bookings: Booking[];
  trainers: User[];
  zoomLinkPool?: string[];
  rangeStart?: Date;
  rangeEnd?: Date;
}): ZoomConflictResult => {
  const trainerMap = new Map(trainers.map(trainer => [trainer.id, trainer]));

  const bookingData: EnrichedBooking[] = bookings
    .filter(booking => booking.status === 'confirmed')
    .map(booking => {
      const trainer = trainerMap.get(booking.trainerId);
      const normalizedZoomLink = normalizeZoomLink(trainer?.zoomMeetingLink);

      return {
        booking,
        trainer,
        normalizedZoomLink,
        start: new Date(booking.startTime),
        end: new Date(booking.endTime),
      };
    })
    .filter(item => {
      if (rangeStart && item.end <= rangeStart) return false;
      if (rangeEnd && item.start >= rangeEnd) return false;
      return true;
    });

  const allZoomLinks = toUniqueLinks([
    ...(zoomLinkPool || []).map(normalizeZoomLink),
    ...trainers.map(trainer => normalizeZoomLink(trainer.zoomMeetingLink)),
    ...trainers.flatMap(trainer => (trainer.preferredZoomLinks || []).map(normalizeZoomLink)),
  ]);

  const concurrentMap = new Map<string, TrainerTimeConflict>();

  for (let i = 0; i < bookingData.length; i += 1) {
    for (let j = i + 1; j < bookingData.length; j += 1) {
      const a = bookingData[i];
      const b = bookingData[j];

      if (a.booking.trainerId === b.booking.trainerId) continue;
      if (!hasTimeOverlap(a.start, a.end, b.start, b.end)) continue;

      const overlapStart = new Date(Math.max(a.start.getTime(), b.start.getTime()));
      const overlapEnd = new Date(Math.min(a.end.getTime(), b.end.getTime()));
      const key = `${overlapStart.toISOString()}|${overlapEnd.toISOString()}`;

      const existing = concurrentMap.get(key);
      if (existing) {
        existing.bookingIds = Array.from(new Set([...existing.bookingIds, a.booking.id, b.booking.id]));
        existing.trainerIds = Array.from(new Set([...existing.trainerIds, a.booking.trainerId, b.booking.trainerId]));
      } else {
        concurrentMap.set(key, {
          startTime: overlapStart.toISOString(),
          endTime: overlapEnd.toISOString(),
          bookingIds: [a.booking.id, b.booking.id],
          trainerIds: [a.booking.trainerId, b.booking.trainerId],
        });
      }
    }
  }

  const zoomLinkConflicts: ZoomConflictSuggestion[] = bookingData
    .map(item => {
      const overlappingBookings = bookingData.filter(other => {
        if (other.booking.id === item.booking.id) return false;
        return hasTimeOverlap(item.start, item.end, other.start, other.end);
      });

      const usedLinksDuringSlot = new Set(
        overlappingBookings
          .map(other => other.normalizedZoomLink)
          .filter(Boolean) as string[]
      );

      const sameLinkConflicts = overlappingBookings.filter(other =>
        !!item.normalizedZoomLink && other.normalizedZoomLink === item.normalizedZoomLink
      );

      const hasMissingLink = !item.normalizedZoomLink;
      const hasDuplicateLinkConflict = sameLinkConflicts.length > 0;

      if (!hasMissingLink && !hasDuplicateLinkConflict) {
        return null;
      }

      const preferredLinks = toUniqueLinks((item.trainer?.preferredZoomLinks || []).map(normalizeZoomLink));
      const ownLink = normalizeZoomLink(item.trainer?.zoomMeetingLink);

      const availableLinks = allZoomLinks.filter(link => {
        if (!link) return false;
        if (usedLinksDuringSlot.has(link)) return false;
        if (item.normalizedZoomLink && link === item.normalizedZoomLink) return false;
        return true;
      });

      const prioritizedSuggestions = toUniqueLinks([
        ...preferredLinks.filter(link => availableLinks.includes(link)),
        ownLink && availableLinks.includes(ownLink) ? ownLink : undefined,
        ...availableLinks,
      ]).slice(0, 5);

      return {
        bookingId: item.booking.id,
        trainerId: item.booking.trainerId,
        trainerName: item.trainer?.name || item.trainer?.email || 'Unknown trainer',
        startTime: item.booking.startTime,
        endTime: item.booking.endTime,
        currentZoomLink: item.normalizedZoomLink,
        reason: hasMissingLink ? 'missing_link' : 'link_conflict',
        conflictWithBookingIds: sameLinkConflicts.map(conflict => conflict.booking.id),
        suggestions: prioritizedSuggestions,
      } satisfies ZoomConflictSuggestion;
    })
    .filter((item): item is ZoomConflictSuggestion => !!item);

  return {
    analyzedBookings: bookingData.length,
    allZoomLinks,
    concurrentSlots: Array.from(concurrentMap.values()).sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    ),
    zoomLinkConflicts,
  };
};
