import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';

export function ExplanationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchRecord = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/attendance/${id}`);
        setRecord(res.data);
        if (res.data?.explanationText) {
          setExplanation(res.data.explanationText);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Không thể tải thông tin bản ghi chấm công');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      toast.error('Vui lòng nhập nội dung giải trình');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/attendance/${id}/submit-explanation`, { explanationText: explanation });
      toast.success('Đã gửi giải trình thành công');
      navigate('/attendance');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Giải trình vi phạm chấm công</CardTitle>
        </CardHeader>
        <div className="p-6">
          {isLoading ? (
            <p className="text-center py-6 text-text-sec">Đang tải thông tin bản ghi...</p>
          ) : (
            <>
              {record && (
                <div className="mb-4 p-3 bg-surface-alt rounded-lg border border-border text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-text-sec">Ngày chấm công:</span>
                    <span className="font-semibold">{record.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-sec">Trạng thái ghi nhận:</span>
                    <span className="font-semibold text-danger">{record.status}</span>
                  </div>
                  {record.checkInTime && (
                    <div className="flex justify-between">
                      <span className="text-text-sec">Thời gian check-in:</span>
                      <span>{new Date(record.checkInTime).toLocaleTimeString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-text-sec mb-4">
                Vui lòng nhập lý do vắng mặt hoặc đi muộn. Phản hồi của bạn sẽ được gửi đến Ban Giám đốc và bộ phận Nhân sự.
              </p>
              <form onSubmit={handleSubmit}>
                <textarea
                  className="w-full h-32 p-3 border border-border rounded-md bg-surface-alt focus:ring-2 focus:ring-brand-500 outline-none resize-none mb-4"
                  placeholder="Nhập nội dung giải trình chi tiết..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate('/attendance')}>Hủy</Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>Gửi giải trình</Button>
                </div>
              </form>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
