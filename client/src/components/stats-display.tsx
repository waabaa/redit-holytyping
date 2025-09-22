import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Target, Clock, Award } from "lucide-react";

interface StatsDisplayProps {
  stats: {
    totalWords: number;
    averageWpm: number;
    averageAccuracy: number;
    totalSessions: number;
  } | undefined;
}

export default function StatsDisplay({ stats }: StatsDisplayProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 bg-muted/30 rounded-lg">
            <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-muted rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      icon: TrendingUp,
      label: "평균 속도",
      value: `${Math.round(stats.averageWpm)} WPM`,
      color: "text-blue-500",
    },
    {
      icon: Target,
      label: "평균 정확도",
      value: `${Math.round(stats.averageAccuracy)}%`,
      color: "text-green-500",
    },
    {
      icon: Award,
      label: "총 단어",
      value: stats.totalWords.toLocaleString(),
      color: "text-yellow-500",
    },
    {
      icon: Clock,
      label: "총 세션",
      value: stats.totalSessions.toString(),
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <div className="font-semibold text-foreground" data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
