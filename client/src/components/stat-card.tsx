import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  testId?: string;
}

interface ProgressStatCardProps {
  title: string;
  current: number;
  total: number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  className?: string;
  testId?: string;
}

interface RankingStatCardProps {
  title: string;
  rank: number;
  total?: number;
  percentile?: number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  className?: string;
  testId?: string;
}

// 기본 통계 카드
export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = "text-primary", 
  subtitle, 
  trend,
  className = "",
  testId 
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-1">
            <span 
              className={`text-xs ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '↗' : '↘'} {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 진행률 통계 카드 (프로그레스 바 포함)
export function ProgressStatCard({
  title,
  current,
  total,
  icon: Icon,
  iconColor = "text-primary",
  subtitle,
  className = "",
  testId
}: ProgressStatCardProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold" data-testid={testId}>
          {current.toLocaleString()}/{total.toLocaleString()}
        </div>
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{percentage}% 완료</span>
          {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// 순위 통계 카드
export function RankingStatCard({
  title,
  rank,
  total,
  percentile,
  icon: Icon,
  iconColor = "text-primary",
  subtitle,
  className = "",
  testId
}: RankingStatCardProps) {
  const getRankDisplay = () => {
    if (rank <= 3) {
      const medals = ['🥇', '🥈', '🥉'];
      return `${medals[rank - 1]} #${rank}`;
    }
    return `#${rank}`;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>
          {getRankDisplay()}
        </div>
        {percentile && (
          <p className="text-xs text-muted-foreground">
            상위 {Math.round(percentile)}%
          </p>
        )}
        {total && (
          <p className="text-xs text-muted-foreground">
            총 {total.toLocaleString()}명 중
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// 멀티 통계 카드 (여러 지표를 한 카드에)
interface MultiStatCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  stats: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  className?: string;
  testId?: string;
}

export function MultiStatCard({
  title,
  icon: Icon,
  iconColor = "text-primary",
  stats,
  className = "",
  testId
}: MultiStatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4" data-testid={testId}>
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-lg font-bold ${stat.color || 'text-foreground'}`}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 목표 달성 카드 (일일/주간 목표용)
interface GoalStatCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  goals: Array<{
    label: string;
    current: number;
    target: number;
    unit?: string;
  }>;
  className?: string;
  testId?: string;
}

export function GoalStatCard({
  title,
  icon: Icon,
  iconColor = "text-primary",
  goals,
  className = "",
  testId
}: GoalStatCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4" data-testid={testId}>
        {goals.map((goal, index) => {
          const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          const isCompleted = goal.current >= goal.target;
          
          return (
            <div key={index}>
              <div className="flex justify-between text-sm mb-2">
                <span>{goal.label}</span>
                <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
                  {goal.current.toLocaleString()}/{goal.target.toLocaleString()}
                  {goal.unit && ` ${goal.unit}`}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className={`h-2 ${isCompleted ? 'bg-green-100' : ''}`}
              />
              {isCompleted && (
                <div className="flex items-center justify-center mt-2">
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    🎉 목표 달성!
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// 업적 카드
interface AchievementCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    progress: number;
    total: number;
    isUnlocked: boolean;
    unlockedAt?: Date | null;
  };
  className?: string;
  testId?: string;
}

export function AchievementCard({
  achievement,
  className = "",
  testId
}: AchievementCardProps) {
  const progressPercentage = (achievement.progress / achievement.total) * 100;
  
  return (
    <div
      className={`p-3 rounded-lg border ${
        achievement.isUnlocked 
          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' 
          : 'bg-muted/50 border-border'
      } ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">
          {achievement.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{achievement.name}</p>
          <p className="text-xs text-muted-foreground">
            {achievement.description}
          </p>
          <div className="mt-2">
            <Progress value={progressPercentage} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {achievement.progress}/{achievement.total}
            </p>
          </div>
        </div>
        {achievement.isUnlocked && (
          <Badge variant="secondary" className="text-xs">
            달성
          </Badge>
        )}
      </div>
    </div>
  );
}