import React, { useState, useRef } from 'react';
import { FileSearch, UploadCloud, CheckCircle, AlertTriangle, ShieldAlert, FileText, RefreshCw, X } from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import api from '../../services/api';
import { toast } from '../../stores/useToastStore';

interface DocumentAnalysisResult {
  documentType: string;
  extractedInfo: Record<string, string>;
  anomalies: string[];
  verdict: 'HỢP LỆ' | 'NGHI NGỜ' | 'GIẢ MẠO';
  confidence: number;
  notes: string;
}

export function DocumentVerifierTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file hình ảnh (JPG, PNG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh tối đa là 5MB');
        return;
      }

      setSelectedFile(file);
      setResult(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file hình ảnh (JPG, PNG)');
        return;
      }
      setSelectedFile(file);
      setResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    try {
      const response = await api.post('/security-ai/verify-document', {
        imageBase64: imagePreview,
        mimeType: selectedFile?.type || 'image/jpeg'
      });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        toast.error(response.data.message || 'Lỗi khi kiểm tra giấy tờ');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi kết nối đến máy chủ');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'HỢP LỆ': return 'text-green-600 bg-green-50 border-green-200';
      case 'NGHI NGỜ': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'GIẢ MẠO': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'HỢP LỆ': return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'NGHI NGỜ': return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'GIẢ MẠO': return <ShieldAlert className="w-8 h-8 text-red-600" />;
      default: return <FileText className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-h4 font-bold text-text-primary mb-2 flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-brand-500" />
          Kiểm tra & Bóc tách Giấy tờ (AI OCR)
        </h3>
        <p className="text-text-sec text-sm mb-4">
          Tải lên hình ảnh Căn cước công dân, Hóa đơn hoặc các tài liệu quan trọng. Trí tuệ nhân tạo sẽ đọc chữ (OCR) và kiểm tra dấu hiệu làm giả, tẩy xóa.
        </p>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Upload Area */}
          <div className="flex-1">
            {!imagePreview ? (
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-surface transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                <h4 className="font-medium text-text-primary mb-1">Kéo thả ảnh hoặc click để chọn</h4>
                <p className="text-xs text-text-sec mb-4">Hỗ trợ JPG, PNG (Tối đa 5MB)</p>
                <Button size="sm" variant="outline" type="button">Chọn file</Button>
              </div>
            ) : (
              <div className="relative border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center h-[300px]">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-full max-w-full object-contain"
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg, image/png"
              onChange={handleFileChange}
            />

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleAnalyze}
                isLoading={isAnalyzing}
                disabled={!imagePreview}
                leftIcon={<FileSearch className="w-4 h-4" />}
              >
                Phân tích Giấy tờ
              </Button>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1">
            {!result ? (
              <div className="h-full border border-border rounded-xl p-6 bg-surface-alt flex flex-col items-center justify-center text-center">
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                    <h4 className="font-medium">Đang xử lý ảnh...</h4>
                    <p className="text-sm text-text-sec mt-2">AI đang đọc nội dung và phân tích các dấu hiệu bất thường.</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 text-text-sec opacity-50 mb-4" />
                    <p className="text-sm text-text-sec">Kết quả phân tích sẽ hiển thị ở đây</p>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full border border-border rounded-xl p-6 bg-white shadow-sm overflow-y-auto max-h-[500px]">
                <h4 className="font-bold text-text-primary mb-4 border-b border-border pb-2">Kết quả phân tích</h4>
                
                <div className={`flex items-center gap-4 p-4 rounded-lg border mb-6 ${getVerdictColor(result.verdict)}`}>
                  {getVerdictIcon(result.verdict)}
                  <div>
                    <div className="text-lg font-bold">{result.verdict}</div>
                    <div className="text-sm font-medium">Độ tin cậy: {result.confidence}%</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-bold text-text-primary mb-1">Loại giấy tờ:</h5>
                    <p className="text-text-sec text-sm bg-surface p-2 rounded">{result.documentType || 'Không xác định'}</p>
                  </div>

                  <div>
                    <h5 className="text-sm font-bold text-brand-600 mb-2 flex items-center gap-1">
                      <FileText className="w-4 h-4" /> Thông tin trích xuất (OCR):
                    </h5>
                    <div className="bg-surface rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <tbody>
                          {result.extractedInfo && Object.entries(result.extractedInfo).length > 0 ? (
                            Object.entries(result.extractedInfo).map(([key, value], idx) => (
                              <tr key={idx} className="border-b border-border last:border-0">
                                <th className="py-2 px-3 bg-gray-50 font-medium text-text-primary w-1/3">{key}</th>
                                <td className="py-2 px-3 text-text-sec break-words">{String(value)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td className="p-3 text-text-sec italic text-center">Không trích xuất được thông tin</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {result.anomalies && result.anomalies.length > 0 && (
                    <div>
                      <h5 className="text-sm font-bold text-red-600 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Dấu hiệu đáng ngờ:
                      </h5>
                      <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                        {result.anomalies.map((anom, idx) => (
                          <li key={idx}>{anom}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.notes && (
                    <div>
                      <h5 className="text-sm font-bold text-text-primary mb-1">Ghi chú thêm:</h5>
                      <p className="text-text-sec text-sm italic">{result.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
