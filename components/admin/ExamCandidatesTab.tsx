import React, { useMemo, useState } from 'react';
import { format, parseISO, compareAsc, compareDesc } from 'date-fns';
import { CalendarDays, CheckCircle2, ClipboardList, Edit3, Plus, Target, Trash2, Undo2, User2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, useDataStore } from '../../store';
import { Button, Card, Input, Badge } from '../ui/Common';
import { ExamCandidate } from '../../types';

type FormState = {
  studentName: string;
  target: string;
  examBookingDate: string;
};

const initialForm: FormState = {
  studentName: '',
  target: '',
  examBookingDate: '',
};

export const ExamCandidatesTab = () => {
  const { user } = useAuthStore();
  const {
    examCandidates,
    addExamCandidate,
    updateExamCandidate,
    deleteExamCandidate,
    markExamCandidateCompleted,
  } = useDataStore();

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const upcomingCandidates = useMemo(
    () => examCandidates
      .filter(candidate => candidate.status !== 'completed')
      .sort((a, b) => compareAsc(parseISO(a.examBookingDate), parseISO(b.examBookingDate))),
    [examCandidates]
  );

  const completedCandidates = useMemo(
    () => examCandidates
      .filter(candidate => candidate.status === 'completed')
      .sort((a, b) => compareDesc(parseISO(a.examBookingDate), parseISO(b.examBookingDate))),
    [examCandidates]
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.target.trim() || !form.examBookingDate) {
      toast.error('Vui lòng nhập đầy đủ họ tên, target và ngày book thi');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateExamCandidate(editingId, {
          studentName: form.studentName.trim(),
          target: form.target.trim(),
          examBookingDate: form.examBookingDate,
        });
        toast.success('Đã cập nhật thông tin học viên');
      } else {
        await addExamCandidate({
          studentName: form.studentName.trim(),
          target: form.target.trim(),
          examBookingDate: form.examBookingDate,
          status: 'upcoming',
          createdBy: user?.id,
        });
        toast.success('Đã thêm học viên vào lịch thi');
      }
      resetForm();
    } catch (error) {
      toast.error('Không thể lưu thông tin học viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (candidate: ExamCandidate) => {
    setEditingId(candidate.id);
    setForm({
      studentName: candidate.studentName,
      target: candidate.target,
      examBookingDate: candidate.examBookingDate,
    });
  };

  const handleDelete = async (candidate: ExamCandidate) => {
    if (!window.confirm(`Xóa học viên ${candidate.studentName} khỏi danh sách lịch thi?`)) return;

    try {
      await deleteExamCandidate(candidate.id);
      if (editingId === candidate.id) resetForm();
      toast.success('Đã xóa học viên khỏi danh sách');
    } catch (error) {
      toast.error('Không thể xóa học viên');
    }
  };

  const handleToggleCompleted = async (candidate: ExamCandidate, completed: boolean) => {
    try {
      await markExamCandidateCompleted(candidate.id, completed);
      toast.success(completed ? 'Đã đánh dấu học viên đã thi' : 'Đã chuyển học viên về danh sách sắp thi');
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const formatExamDate = (value: string) => {
    try {
      return format(parseISO(value), 'dd/MM/yyyy');
    } catch {
      return value;
    }
  };

  const renderCandidateCard = (candidate: ExamCandidate, completed = false) => (
    <Card key={candidate.id} className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={completed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-[#fedac2] text-[#fc5d01] border-[#fdbc94]'}>
              {completed ? 'Đã thi' : 'Sắp thi'}
            </Badge>
            <span className="text-xs text-slate-400">ID: {candidate.id.slice(-6)}</span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">{candidate.studentName}</h3>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Target className="h-4 w-4 text-[#fc5d01]" />
                Target: <strong className="text-slate-900">{candidate.target}</strong>
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#fc5d01]" />
                Ngày thi: <strong className="text-slate-900">{formatExamDate(candidate.examBookingDate)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(candidate)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Sửa
          </Button>

          {completed ? (
            <Button type="button" variant="outline" size="sm" onClick={() => handleToggleCompleted(candidate, false)}>
              <Undo2 className="mr-2 h-4 w-4" />
              Chuyển về sắp thi
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => handleToggleCompleted(candidate, true)} className="text-white" style={{ backgroundColor: '#fc5d01' }}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Đánh dấu đã thi
            </Button>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(candidate)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="p-6 md:p-7">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: '#fdbc94', backgroundColor: '#fff7f2', color: '#fc5d01' }}>
                <ClipboardList className="h-4 w-4" />
                Quản lý lịch thi học viên
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Exam Schedule Manager</h2>
              <p className="mt-2 text-sm md:text-base text-slate-600">Theo dõi học viên sắp thi, cập nhật target và đánh dấu hoàn thành ngay trong dashboard.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:min-w-[220px]">
              <div className="rounded-xl border p-4 text-center bg-white shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Upcoming</div>
                <div className="mt-1 text-2xl font-bold text-slate-800">{upcomingCandidates.length}</div>
              </div>
              <div className="rounded-xl border p-4 text-center bg-white shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Completed</div>
                <div className="mt-1 text-2xl font-bold text-slate-800">{completedCandidates.length}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1.4fr_0.9fr_0.9fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Họ tên học viên</label>
              <div className="relative">
                <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.studentName}
                  onChange={e => setForm(prev => ({ ...prev, studentName: e.target.value }))}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Target</label>
              <Input
                value={form.target}
                onChange={e => setForm(prev => ({ ...prev, target: e.target.value }))}
                placeholder="Ví dụ: PTE 65+"
                className="h-11"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Ngày book thi</label>
              <Input
                type="date"
                value={form.examBookingDate}
                onChange={e => setForm(prev => ({ ...prev, examBookingDate: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="h-11 min-w-[140px] text-white" style={{ backgroundColor: '#fc5d01' }}>
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? 'Lưu cập nhật' : 'Thêm mới'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="h-11">
                  Hủy
                </Button>
              )}
            </div>
          </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Học viên sắp thi</h3>
            <Badge className="border-[#fdbc94] bg-[#fff7f2] text-[#fc5d01]">{upcomingCandidates.length} học viên</Badge>
          </div>
          {upcomingCandidates.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 border-dashed bg-white">
              Chưa có học viên nào trong danh sách sắp thi.
            </Card>
          ) : (
            upcomingCandidates.map(candidate => renderCandidateCard(candidate))
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Đã thi</h3>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{completedCandidates.length} học viên</Badge>
          </div>
          {completedCandidates.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 border-dashed bg-white">
              Chưa có học viên nào được đánh dấu đã thi.
            </Card>
          ) : (
            completedCandidates.map(candidate => renderCandidateCard(candidate, true))
          )}
        </section>
      </div>
    </div>
  );
};