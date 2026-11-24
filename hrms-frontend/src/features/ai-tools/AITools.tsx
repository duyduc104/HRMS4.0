import { Tabs } from '../../components/ui/Tabs/Tabs';
import { ScamDetectorTab } from './ScamDetectorTab';
import { DocumentVerifierTab } from './DocumentVerifierTab';

export function AITools() {
  const tabs = [
    {
      id: 'scam-detect',
      label: 'Phát hiện lừa đảo',
      content: <ScamDetectorTab />
    },
    {
      id: 'doc-verify',
      label: 'Xác thực giấy tờ',
      content: <DocumentVerifierTab />
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-bold mb-1">Công cụ AI</h1>
        <p className="text-text-sec">Các công cụ trí tuệ nhân tạo hỗ trợ nhận diện văn bản lừa đảo và xác thực tính toàn vẹn của giấy tờ.</p>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}
