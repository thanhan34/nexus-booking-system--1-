import React, { useState } from 'react';
import { useDataStore } from '../../store';
import { Card, Button, Input, Badge, Dialog } from '../ui/Common';
import { Plus, Edit, Trash2, Clock, Calendar, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { EventType } from '../../types';

export const EventTypesTab = () => {
  const { eventTypes, addEventType, updateEventType } = useDataStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 60,
    color: 'blue',
    active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      durationMinutes: 60,
      color: 'blue',
      active: true
    });
    setEditingEventType(null);
  };

  const handleOpenDialog = (eventType?: EventType) => {
    if (eventType) {
      setEditingEventType(eventType);
      setFormData({
        name: eventType.name,
        description: eventType.description,
        durationMinutes: eventType.durationMinutes,
        color: eventType.color,
        active: eventType.active
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingEventType) {
        await updateEventType(editingEventType.id, formData);
        toast.success('Event type updated successfully');
      } else {
        await addEventType(formData);
        toast.success('Event type created successfully');
      }
      handleCloseDialog();
    } catch (error) {
      toast.error('Failed to save event type');
      console.error(error);
    }
  };

  const handleToggleActive = async (eventType: EventType) => {
    try {
      await updateEventType(eventType.id, { active: !eventType.active });
      toast.success(`Event type ${eventType.active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update event type');
      console.error(error);
    }
  };

  const colorOptions = [
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'purple', label: 'Purple', color: '#a855f7' },
    { value: 'green', label: 'Green', color: '#22c55e' },
    { value: 'orange', label: 'Orange', color: '#fc5d01' },
    { value: 'red', label: 'Red', color: '#ef4444' },
    { value: 'yellow', label: 'Yellow', color: '#eab308' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Event Types Management</h2>
          <p className="text-sm text-slate-600 mt-1">Create and manage different types of sessions for booking</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2"
          style={{ backgroundColor: '#fc5d01' }}
        >
          <Plus className="w-4 h-4" />
          New Event Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventTypes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No event types yet</p>
            <p className="text-sm mt-2">Create your first event type to start accepting bookings</p>
          </div>
        ) : (
          eventTypes.map(eventType => {
            const colorOption = colorOptions.find(c => c.value === eventType.color);
            const borderColor = colorOption?.color || '#3b82f6';

            return (
              <Card 
                key={eventType.id} 
                className="p-6 flex flex-col justify-between border-t-4 hover:shadow-lg transition-all"
                style={{ borderTopColor: borderColor }}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-slate-800">{eventType.name}</h3>
                      <p className="text-sm text-slate-600 mt-2">{eventType.description}</p>
                    </div>
                    <Badge 
                      className={`ml-2 ${eventType.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {eventType.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{eventType.durationMinutes} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: borderColor }}
                      />
                      <span className="capitalize">{eventType.color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenDialog(eventType)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleActive(eventType)}
                    className={`flex-1 ${eventType.active ? 'text-slate-600' : 'text-green-600'}`}
                  >
                    {eventType.active ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={handleCloseDialog}
        title={editingEventType ? 'Edit Event Type' : 'Create New Event Type'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Event Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PTE Speaking Session"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this session includes..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 min-h-[100px]"
              style={{ borderColor: '#fdbc94', focusRing: '#fc5d01' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
              min="15"
              max="480"
              step="15"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Duration must be between 15 and 480 minutes</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: option.value })}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    formData.color === option.value 
                      ? 'border-slate-800 bg-slate-50 scale-105' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 focus:ring-2"
              style={{ accentColor: '#fc5d01' }}
            />
            <label htmlFor="active" className="text-sm font-semibold text-slate-700">
              Active (visible to students for booking)
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: '#fc5d01' }}
            >
              {editingEventType ? 'Update' : 'Create'} Event Type
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
