import React from 'react';
import { format } from 'date-fns';
import { Dialog, Button } from '../ui/Common';
import { User } from '../../types';
import { SupportSlotDetails } from './TrainerSupportTypes';

interface TrainerSupportDialogProps {
  slot: SupportSlotDetails | null;
  adminUser?: User;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const TrainerSupportDialog = ({
  slot,
  adminUser,
  saving,
  onClose,
  onConfirm
}: TrainerSupportDialogProps) => (
  <Dialog
    open={!!slot}
    onClose={onClose}
    title="Add Support Session to Google Calendar"
  >
    {slot && (
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          <div><strong>Trainer:</strong> {slot.trainer.name}</div>
          <div><strong>Email:</strong> {slot.trainer.email}</div>
          <div><strong>Date:</strong> {format(slot.start, 'EEEE, MMM d, yyyy')}</div>
          <div><strong>Time:</strong> {format(slot.start, 'HH:mm')} - {format(slot.end, 'HH:mm')}</div>
          {adminUser && (
            <div><strong>Admin:</strong> {adminUser.name || adminUser.email}</div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            style={{ borderColor: '#fdbc94', color: '#fc5d01' }}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            style={{ backgroundColor: '#fc5d01' }}
          >
            {saving ? 'Adding...' : 'Add to Google Calendar'}
          </Button>
        </div>
      </div>
    )}
  </Dialog>
);