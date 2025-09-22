import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BookOpen, Calendar, Clock } from "lucide-react";

interface WeeklyProgressData {
  day: string;
  sessions: number;
  wpm: number;
  accuracy: number;
  wordsTyped: number;
}

interface BookProgressData {
  book: string;
  progress: number;
  totalVerses: number;
  completedVerses: number;
}

interface SessionTrendData {
  date: string;
  wpm: number;
  accuracy: number;
  duration: number;
  points: number;
}

interface ChartProps {
  className?: string;
}

// 주간 진행률 차트
interface WeeklyProgressChartProps extends ChartProps {
  data: WeeklyProgressData[];
}

export function WeeklyProgressChart({ data, className = "" }: WeeklyProgressChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <span>주간 연습 현황</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="sessions"
                orientation="left"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="wpm"
                orientation="right"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <div className="space-y-1 mt-2">
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: {entry.value}
                              {entry.dataKey === 'wpm' ? ' WPM' : 
                               entry.dataKey === 'accuracy' ? '%' : 
                               entry.dataKey === 'sessions' ? '회' : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                yAxisId="sessions"
                type="monotone" 
                dataKey="sessions" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="연습 세션"
                dot={{ fill: '#3b82f6' }}
              />
              <Line 
                yAxisId="wpm"
                type="monotone" 
                dataKey="wpm" 
                stroke="#10b981" 
                strokeWidth={2}
                name="평균 WPM"
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 성경 책별 진행률 차트
interface BibleProgressChartProps extends ChartProps {
  data: BookProgressData[];
}

export function BibleProgressChart({ data, className = "" }: BibleProgressChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-green-500" />
          <span>성경 책별 진행률</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="book" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm">진행률: {data.progress}%</p>
                          <p className="text-sm">완료: {data.completedVerses}/{data.totalVerses}절</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="progress" 
                fill="#10b981"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 최근 세션 성과 추세 차트
interface SessionTrendChartProps extends ChartProps {
  data: SessionTrendData[];
}

export function SessionTrendChart({ data, className = "" }: SessionTrendChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          <span>최근 성과 추세</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="wpm"
                orientation="left"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="accuracy"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <div className="space-y-1 mt-2">
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: {entry.value}
                              {entry.dataKey === 'wpm' ? ' WPM' : 
                               entry.dataKey === 'accuracy' ? '%' : 
                               entry.dataKey === 'duration' ? '분' : 
                               entry.dataKey === 'points' ? '점' : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                yAxisId="wpm"
                type="monotone"
                dataKey="wpm"
                stackId="1"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                name="WPM"
              />
              <Area
                yAxisId="accuracy"
                type="monotone"
                dataKey="accuracy"
                stackId="2"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.3}
                name="정확도"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 연습 시간 분포 파이 차트
interface PracticeTimeDistributionData {
  period: string;
  hours: number;
  sessions: number;
}

interface PracticeTimeChartProps extends ChartProps {
  data: PracticeTimeDistributionData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export function PracticeTimeChart({ data, className = "" }: PracticeTimeChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <span>연습 시간 분포</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ period, percent }) => `${period} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="hours"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.period}</p>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm">연습 시간: {data.hours}시간</p>
                          <p className="text-sm">세션 수: {data.sessions}회</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 월간 진행률 요약 차트
interface MonthlyProgressData {
  month: string;
  sessions: number;
  wordsTyped: number;
  avgWpm: number;
  avgAccuracy: number;
  practiceTime: number;
}

interface MonthlyProgressChartProps extends ChartProps {
  data: MonthlyProgressData[];
}

export function MonthlyProgressChart({ data, className = "" }: MonthlyProgressChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          <span>월간 진행률</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="sessions"
                orientation="left"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <YAxis 
                yAxisId="wpm"
                orientation="right"
                tick={{ fontSize: 12 }}
                axisLine={false}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm">연습 세션: {data.sessions}회</p>
                          <p className="text-sm">타자 수: {data.wordsTyped.toLocaleString()}단어</p>
                          <p className="text-sm">평균 WPM: {data.avgWpm}</p>
                          <p className="text-sm">평균 정확도: {data.avgAccuracy}%</p>
                          <p className="text-sm">연습 시간: {data.practiceTime}시간</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                yAxisId="sessions"
                dataKey="sessions" 
                fill="#3b82f6"
                name="연습 세션"
              />
              <Bar 
                yAxisId="wpm"
                dataKey="avgWpm" 
                fill="#10b981"
                name="평균 WPM"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}