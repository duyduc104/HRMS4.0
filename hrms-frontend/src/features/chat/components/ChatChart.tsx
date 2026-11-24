import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

interface ChartData {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  seriesKey?: string;
  valueKey?: string;
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ChatChart({ chartData }: { chartData: ChartData }) {
  if (!chartData || !chartData.data) return null;

  // Tính toán chiều rộng động dựa trên số lượng dữ liệu để hiển thị thanh trượt nếu cần
  const chartWidth = Math.max(300, chartData.data.length * 60 + 100);

  const renderChart = () => {
    switch (chartData.chartType) {
      case 'bar':
        return (
          <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey={chartData.xKey || 'name'} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '4px 8px' }} />
            <Bar dataKey={chartData.yKey || 'value'} fill={chartData.colors?.[0] || DEFAULT_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '4px 8px' }} />
            <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '10px' }}/>
            <Pie
              data={chartData.data}
              dataKey={chartData.valueKey || 'value'}
              nameKey={chartData.seriesKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={55}
              innerRadius={25}
              paddingAngle={5}
            >
              {chartData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartData.colors?.[index % chartData.colors.length] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case 'line':
      default:
        return (
          <LineChart data={chartData.data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey={chartData.xKey || 'name'} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '4px 8px' }} />
            <Line type="monotone" dataKey={chartData.yKey || 'value'} stroke={chartData.colors?.[0] || DEFAULT_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        );
    }
  };

  return (
    <div 
      className="bg-surface border border-border p-3 rounded-xl mt-2 shadow-sm h-[220px] flex flex-col"
      style={{ width: `${chartWidth}px` }}
    >
      <h4 className="font-bold text-xs text-center mb-2 text-text-primary whitespace-normal">{chartData.title}</h4>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
