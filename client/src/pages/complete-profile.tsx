import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, MapPin, Users, Search, Loader2, CheckCircle, Info, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Church } from "@shared/schema";

// Form validation schema
const completeProfileSchema = z.object({
  age: z.number().min(10).max(100).optional(),
  region: z.string().max(100).optional(),
  churchId: z.string().nullable().optional(),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

// 한국 시/도 목록
const koreanRegions = [
  "서울특별시",
  "부산광역시", 
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

// 연령 옵션 생성 (10-90세)
const generateAgeOptions = () => {
  const ages = [];
  for (let age = 10; age <= 90; age++) {
    ages.push(age);
  }
  return ages;
};

export default function CompleteProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [churchSearch, setChurchSearch] = useState("");
  const [isChurchSearchOpen, setIsChurchSearchOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // 사용자의 현재 교회 정보 조회
  const { data: userChurch } = useQuery<Church>({
    queryKey: ["/api/user/church"],
    enabled: !!user,
  });

  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      age: user?.age || undefined,
      region: user?.region || undefined,
      churchId: user?.churchId || undefined,
    },
  });

  // 사용자 데이터가 로드되면 폼 기본값 업데이트
  useEffect(() => {
    if (user) {
      form.reset({
        age: user.age || undefined,
        region: user.region || undefined,
        churchId: user.churchId || undefined,
      });
      
      // 교회 정보가 있으면 검색창에도 설정
      if (userChurch) {
        setChurchSearch(userChurch.name);
      }
    }
  }, [user, userChurch, form]);

  // 교회 목록 조회
  const { data: churches, isLoading: churchesLoading } = useQuery<Church[]>({
    queryKey: ["/api/churches", { search: churchSearch }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (churchSearch.trim()) {
        params.append("search", churchSearch.trim());
      }
      params.append("limit", "20");
      return fetch(`/api/churches?${params.toString()}`).then(res => res.json());
    },
    enabled: isChurchSearchOpen,
  });

  // 프로필 업데이트 mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfileFormData) => {
      const response = await apiRequest("PATCH", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: async () => {
      console.log("Profile update success - starting navigation process");
      setIsNavigating(true);
      
      toast({
        title: "프로필이 완성되었습니다! 🎉",
        description: "추가 정보가 저장되었습니다. 이제 모든 기능을 이용하실 수 있습니다.",
        duration: 2000,
      });
      
      try {
        console.log("Invalidating queries...");
        // 캐시 무효화 후 새로운 사용자 데이터 로드 대기
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/user/church"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/churches"] });
        
        console.log("Refetching user data...");
        // 사용자 데이터가 실제로 업데이트될 때까지 기다림
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        
        console.log("Setting up navigation timeout...");
        // 성공 메시지를 사용자가 볼 수 있도록 짧은 딜레이 후 홈으로 이동
        setTimeout(() => {
          console.log("Navigating to home page...");
          // wouter navigate 대신 window.location 사용
          window.location.href = "/";
          console.log("Navigation call completed");
        }, 500);
      } catch (error) {
        console.error("Error during profile completion:", error);
        // 에러가 발생해도 리다이렉션은 진행
        setTimeout(() => {
          console.log("Error fallback - navigating to home page...");
          window.location.href = "/";
        }, 500);
      }
    },
    onError: (error: any) => {
      setIsNavigating(false);
      toast({
        title: "프로필 업데이트에 실패했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompleteProfileFormData) => {
    // 빈 값들을 필터링하되 null은 유지 (교회 선택 해제를 의미)
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== "" || value === null)
    );
    updateProfileMutation.mutate(filteredData);
  };

  // Skip 기능을 위한 mutation (빈 데이터로 profileCompleted만 true로 설정)
  const skipProfileMutation = useMutation({
    mutationFn: async () => {
      // 빈 객체를 보내더라도 서버에서 profileCompleted를 true로 설정함
      const response = await apiRequest("PATCH", "/api/users/profile", {});
      return response.json();
    },
    onSuccess: async () => {
      console.log("Profile skip success - starting navigation process");
      setIsNavigating(true);
      
      toast({
        title: "나중에 완성하기로 했습니다",
        description: "언제든지 프로필 페이지에서 추가 정보를 입력하실 수 있습니다.",
        duration: 2000,
      });
      
      try {
        console.log("Skip: Invalidating queries...");
        // 캐시 무효화 후 새로운 사용자 데이터 로드 대기
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
        
        console.log("Skip: Setting up navigation timeout...");
        // 짧은 딜레이 후 홈으로 이동
        setTimeout(() => {
          console.log("Skip: Navigating to home page...");
          window.location.href = "/";
          console.log("Skip: Navigation call completed");
        }, 500);
      } catch (error) {
        console.error("Error during profile skip:", error);
        setTimeout(() => {
          console.log("Skip error fallback - navigating to home page...");
          window.location.href = "/";
        }, 500);
      }
    },
    onError: (error: any) => {
      setIsNavigating(false);
      toast({
        title: "오류가 발생했습니다",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSkip = () => {
    if (!updateProfileMutation.isPending && !skipProfileMutation.isPending && !isNavigating) {
      skipProfileMutation.mutate();
    }
  };

  const handleChurchSelect = (churchId: string, churchName: string) => {
    form.setValue("churchId", churchId);
    setIsChurchSearchOpen(false);
    setChurchSearch(churchName);
  };

  const selectedChurch = form.watch('churchId') 
    ? churches?.find(c => c.id === form.watch('churchId')) ?? null 
    : null;
  
  // 업데이트될 정보 표시를 위한 상태
  const formValues = form.watch();
  const hasChanges = (
    formValues.age !== (user?.age || undefined) ||
    formValues.region !== (user?.region || undefined) ||
    formValues.churchId !== (user?.churchId || undefined)
  );

  // 변경될 항목들 계산
  const getChangingSections = () => {
    const changes = [];
    if (formValues.age !== (user?.age || undefined)) {
      changes.push('연령');
    }
    if (formValues.region !== (user?.region || undefined)) {
      changes.push('지역');
    }
    if (formValues.churchId !== (user?.churchId || undefined)) {
      changes.push('교회');
    }
    return changes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            프로필 완성하기
          </h1>
          <p className="text-muted-foreground text-lg">
            더 나은 서비스를 위해 몇 가지 추가 정보를 알려주세요. 
            <br />모든 항목은 선택사항이며 언제든지 변경할 수 있습니다.
          </p>
        </div>

        {/* 진행 상태 표시 카드 */}
        {hasChanges && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    다음 정보가 업데이트됩니다:
                  </h3>
                  <div className="space-y-1">
                    {getChangingSections().map((section, index) => (
                      <div key={index} className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                        {section} 정보
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 현재 설정 정보 표시 */}
        {(user?.age || user?.region || userChurch) && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-4">
              <h3 className="font-medium mb-3 text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                현재 설정된 정보
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">연령:</span>
                  <span className="ml-2 font-medium" data-testid="text-current-age">
                    {user?.age ? `${user.age}세` : '미설정'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">지역:</span>
                  <span className="ml-2 font-medium" data-testid="text-current-region">
                    {user?.region || '미설정'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">교회:</span>
                  <span className="ml-2 font-medium" data-testid="text-current-church">
                    {userChurch?.name || '미설정'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 프로필 폼 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-primary" />
              추가 정보 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 연령 선택 */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2" />
                        연령 (선택사항)
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-age">
                            <SelectValue placeholder="연령을 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {generateAgeOptions().map((age) => (
                            <SelectItem key={age} value={age.toString()}>
                              {age}세
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 지역 선택 */}
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        지역 (선택사항)
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="거주 지역을 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {koreanRegions.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 교회 선택 */}
                <FormField
                  control={form.control}
                  name="churchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        교회 (선택사항)
                      </FormLabel>
                      <div className="space-y-3">
                        {/* 교회 검색 입력 */}
                        <div className="flex space-x-2">
                          <Input
                            placeholder="교회명을 검색해주세요"
                            value={churchSearch}
                            onChange={(e) => {
                              setChurchSearch(e.target.value);
                              setIsChurchSearchOpen(true);
                            }}
                            data-testid="input-church-search"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsChurchSearchOpen(true)}
                            data-testid="button-church-search"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* 선택된 교회 표시 */}
                        {selectedChurch && (
                          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-primary" data-testid="text-selected-church">
                                  {selectedChurch.name}
                                </p>
                                {selectedChurch.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {selectedChurch.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  form.setValue("churchId", null);
                                  setChurchSearch("");
                                }}
                                data-testid="button-clear-church"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* 교회 검색 결과 */}
                        {isChurchSearchOpen && churchSearch.trim() && (
                          <div className="border border-border rounded-md max-h-60 overflow-y-auto">
                            {churchesLoading ? (
                              <div className="p-4 text-center">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">검색 중...</p>
                              </div>
                            ) : churches && churches.length > 0 ? (
                              <div className="space-y-1 p-2">
                                {churches.map((church) => (
                                  <button
                                    key={church.id}
                                    type="button"
                                    onClick={() => handleChurchSelect(church.id, church.name)}
                                    className="w-full text-left p-3 hover:bg-muted rounded-md transition-colors"
                                    data-testid={`button-church-option-${church.id}`}
                                  >
                                    <div className="font-medium">{church.name}</div>
                                    {church.description && (
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {church.description}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground">
                                  검색 결과가 없습니다.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 버튼들 */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    type="submit"
                    className="flex-1 relative"
                    disabled={updateProfileMutation.isPending || skipProfileMutation.isPending || isNavigating}
                    data-testid="button-submit-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : isNavigating ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        완료! 홈으로 이동 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {hasChanges ? `변경사항 저장하기` : '완료하기'}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={updateProfileMutation.isPending || skipProfileMutation.isPending || isNavigating}
                    data-testid="button-skip-profile"
                  >
                    {skipProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      '나중에 하기'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 안내 메시지 */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>
                💡 <strong>알려드립니다:</strong> 모든 정보는 선택사항이며, 나중에 프로필 페이지에서 언제든지 변경하실 수 있습니다.
              </p>
              {(updateProfileMutation.isPending || isNavigating) && (
                <p className="text-primary font-medium flex items-center justify-center mt-3">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {updateProfileMutation.isPending ? '정보를 저장하고 있습니다...' : '성공적으로 저장되었습니다! 홈으로 이동 중...'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}