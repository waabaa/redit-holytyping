import { Card, CardContent, CardHeader } from "@/components/ui/card";

// 기본 스켈레톤 컴포넌트
export function Skeleton({ className = "", width, height }: { 
  className?: string; 
  width?: string | number; 
  height?: string | number; 
}) {
  return (
    <div 
      className={`animate-pulse bg-muted rounded ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height 
      }}
      aria-label="로딩 중"
    />
  );
}

// 통계 카드 스켈레톤
export function StatCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className} aria-label="통계 카드 로딩 중">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton width="80px" height="16px" />
        <Skeleton width="16px" height="16px" />
      </CardHeader>
      <CardContent>
        <Skeleton width="60px" height="28px" className="mb-2" />
        <Skeleton width="120px" height="12px" />
      </CardContent>
    </Card>
  );
}

// 차트 스켈레톤
export function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className} aria-label="차트 로딩 중">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Skeleton width="20px" height="20px" />
          <Skeleton width="120px" height="20px" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton width="100%" height="300px" />
      </CardContent>
    </Card>
  );
}

// 목표 카드 스켈레톤
export function GoalCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className} aria-label="목표 카드 로딩 중">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Skeleton width="20px" height="20px" />
          <Skeleton width="100px" height="20px" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <Skeleton width="60px" height="14px" />
            <Skeleton width="40px" height="14px" />
          </div>
          <Skeleton width="100%" height="8px" />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <Skeleton width="50px" height="14px" />
            <Skeleton width="50px" height="14px" />
          </div>
          <Skeleton width="100%" height="8px" />
        </div>
      </CardContent>
    </Card>
  );
}

// 최근 세션 스켈레톤
export function SessionItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" aria-label="연습 기록 로딩 중">
      <div className="flex items-center space-x-3">
        <Skeleton width="16px" height="16px" />
        <div>
          <Skeleton width="100px" height="14px" className="mb-1" />
          <Skeleton width="80px" height="12px" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <Skeleton width="40px" height="14px" className="mb-1" />
          <Skeleton width="20px" height="12px" />
        </div>
        <div className="text-center">
          <Skeleton width="30px" height="14px" className="mb-1" />
          <Skeleton width="25px" height="12px" />
        </div>
      </div>
    </div>
  );
}

// 업적 카드 스켈레톤
export function AchievementSkeleton() {
  return (
    <div className="p-3 rounded-lg border bg-muted/50" aria-label="업적 로딩 중">
      <div className="flex items-center space-x-3">
        <Skeleton width="32px" height="32px" />
        <div className="flex-1">
          <Skeleton width="120px" height="14px" className="mb-1" />
          <Skeleton width="150px" height="12px" className="mb-2" />
          <Skeleton width="100%" height="4px" className="mb-1" />
          <Skeleton width="40px" height="12px" />
        </div>
        <Skeleton width="30px" height="20px" />
      </div>
    </div>
  );
}

// 대시보드 통합 스켈레톤
export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" aria-label="대시보드 로딩 중">
      {/* 헤더 스켈레톤 */}
      <div className="mb-8">
        <Skeleton width="200px" height="32px" className="mb-2" />
        <Skeleton width="300px" height="16px" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* 왼쪽 컬럼 */}
        <div className="xl:col-span-2 space-y-6">
          {/* 통계 카드들 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* 목표 카드들 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalCardSkeleton />
            <GoalCardSkeleton />
          </div>

          {/* 최근 세션 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Skeleton width="20px" height="20px" />
                <Skeleton width="120px" height="20px" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SessionItemSkeleton key={i} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 차트들 */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        </div>

        {/* 오른쪽 컬럼 */}
        <div className="space-y-6">
          {/* 업적 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Skeleton width="20px" height="20px" />
                <Skeleton width="60px" height="20px" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <AchievementSkeleton key={i} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 랭킹 카드 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Skeleton width="20px" height="20px" />
                <Skeleton width="80px" height="20px" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton width="24px" height="24px" />
                    <Skeleton width="80px" height="14px" />
                  </div>
                  <Skeleton width="60px" height="14px" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}