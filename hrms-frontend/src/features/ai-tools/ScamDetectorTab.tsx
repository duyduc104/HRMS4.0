import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Info, ShieldQuestion } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import api from '../../services/api';
import { toast } from '../../stores/useToastStore';

interface ScamAnalysisResult {
  riskLevel: 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'RẤT CAO';
  scamType: string;
  redFlags: string[];
  recommendation: string;
  confidence: number;
}

export function ScamDetectorTab() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScamAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('Vui lòng nhập nội dung cần phân tích');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await api.post('/security-ai/check-scam', { text });
      if (response.data.success) {
        setResult(response.data.data);
      } else {
        toast.error(response.data.message || 'Lỗi phân tích');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi kết nối đến máy chủ');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'THẤP': return 'text-green-600 bg-green-50 border-green-200';
      case 'TRUNG BÌNH': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'CAO': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'RẤT CAO': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'THẤP': return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'TRUNG BÌNH': return <Info className="w-8 h-8 text-yellow-600" />;
      case 'CAO': return <AlertTriangle className="w-8 h-8 text-orange-600" />;
      case 'RẤT CAO': return <ShieldAlert className="w-8 h-8 text-red-600" />;
      default: return <ShieldQuestion className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-h4 font-bold text-text-primary mb-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-brand-500" />
          Phân tích tin nhắn lừa đảo (AI)
        </h3>
        <p className="text-text-sec text-sm mb-4">
          Dán nội dung tin nhắn, email hoặc đường link đáng ngờ vào đây. Trí tuệ nhân tạo sẽ phân tích và đưa ra cảnh báo rủi ro lừa đảo.
        </p>

        <textarea
          className="w-full h-32 p-3 border border-border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none mb-4"
          placeholder="Nhập nội dung tin nhắn SMS, Zalo, Email, URL..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex justify-end">
          <Button
            onClick={handleAnalyze}
            isLoading={isAnalyzing}
            disabled={!text.trim()}
          >
            Phân tích bằng AI
          </Button>
        </div>
      </div>

      {result && (
        <div className="bg-white p-6 rounded-xl border border-border shadow-sm animate-fade-in">
          <h4 className="font-bold text-text-primary mb-4 border-b border-border pb-2">Kết quả phân tích</h4>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className={`flex flex-col items-center justify-center p-6 rounded-lg border min-w-[200px] ${getRiskColor(result.riskLevel)}`}>
              {getRiskIcon(result.riskLevel)}
              <span className="text-xl font-bold mt-2">{result.riskLevel}</span>
              <span className="text-xs mt-1 uppercase font-semibold">Mức độ rủi ro</span>
              <div className="mt-4 text-sm font-medium">
                Độ tin cậy: {result.confidence}%
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">Loại lừa đảo phát hiện:</h5>
                <p className="text-text-sec text-sm bg-surface p-2 rounded">{result.scamType || 'Không rõ'}</p>
              </div>

              <div>
                <h5 className="text-sm font-bold text-red-600 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Dấu hiệu nghi vấn:
                </h5>
                <ul className="list-disc pl-5 text-sm text-text-sec space-y-1">
                  {result.redFlags && result.redFlags.length > 0 ? (
                    result.redFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))
                  ) : (
                    <li>Không có dấu hiệu bất thường rõ ràng.</li>
                  )}
                </ul>
              </div>

              <div>
                <h5 className="text-sm font-bold text-green-600 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Gợi ý hành động:
                </h5>
                <p className="text-text-sec text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                  {result.recommendation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
