import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Globe, Keyboard, Users, ChartLine, Trophy, Calendar } from "lucide-react";
import { FaGoogle, FaGithub, FaApple } from "react-icons/fa";
import { SiKakaotalk, SiNaver } from "react-icons/si";

export default function Landing() {
  const features = [
    {
      icon: Globe,
      title: "다국어 성경 지원",
      description: "한국어, 영어, 중국어, 일본어 등 다양한 언어로 성경을 필사하며 말씀을 더 깊이 이해하세요"
    },
    {
      icon: Keyboard,
      title: "정확한 타이핑 연습",
      description: "실시간 정확도와 속도 측정을 통해 체계적으로 타이핑 실력을 향상시키며 말씀을 암송하세요"
    },
    {
      icon: Users,
      title: "교회 커뮤니티",
      description: "교회별 그룹을 만들고 함께 성장하며, 건전한 경쟁을 통해 서로 격려하는 신앙공동체를 형성하세요"
    },
    {
      icon: ChartLine,
      title: "개인 통계 대시보드",
      description: "타이핑 기록, 진행률, 성취도를 한눈에 확인하고 개인별 맞춤 학습 계획을 세워보세요"
    },
    {
      icon: Trophy,
      title: "리더보드 & 경쟁",
      description: "개인간, 교회간 리더보드를 통해 건전한 경쟁 의식을 갖고 함께 성장하는 기쁨을 누리세요"
    },
    {
      icon: Calendar,
      title: "일일 챌린지",
      description: "일별, 주별, 월별 챌린지에 참여하여 꾸준한 말씀 묵상 습관을 만들어 나가세요"
    }
  ];

  const socialLogins = [
    { icon: FaGoogle, name: "Google", color: "text-red-500" },
    { icon: FaGithub, name: "GitHub", color: "text-gray-700 dark:text-gray-300" },
    { icon: FaApple, name: "Apple", color: "text-gray-800 dark:text-gray-200" }
  ];

  const koreanSocialLogins = [
    { icon: SiKakaotalk, name: "카카오톡", nameEn: "Kakao", color: "text-yellow-500", url: "/auth/kakao" },
    { icon: SiNaver, name: "네이버", nameEn: "Naver", color: "text-green-600", url: "/auth/naver" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bible-texture">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                말씀을 마음에 <span className="text-primary">새기다</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                다국어 성경 타이핑을 통해 하나님의 말씀을 깊이 묵상하고, 
                전 세계 성도들과 함께 성장하세요
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/api/login">
                <Button size="lg" className="h-12 px-8 text-lg font-semibold" data-testid="button-start">
                  <Keyboard className="mr-2 h-5 w-5" />
                  지금 시작하기
                </Button>
              </a>
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg font-medium" data-testid="button-demo">
                <BookOpen className="mr-2 h-5 w-5" />
                데모 보기
              </Button>
            </div>

            {/* Korean Social Login Options */}
            <div className="pt-8 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-4">한국 소셜 계정으로 간편하게 시작하세요</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {koreanSocialLogins.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a key={social.nameEn} href={social.url}>
                        <Button 
                          size="lg"
                          className="flex items-center px-8 py-4 h-12 text-base font-semibold hover:shadow-md transition-all"
                          data-testid={`button-social-${social.nameEn.toLowerCase()}`}
                        >
                          <Icon className={`${social.color} mr-3 h-5 w-5`} />
                          <span>{social.name}으로 시작하기</span>
                        </Button>
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-sm text-muted-foreground mb-4">또는 다른 계정으로 시작하세요</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {socialLogins.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a key={social.name} href="/api/login">
                        <Button 
                          variant="outline" 
                          className="flex items-center px-6 py-3 hover:bg-secondary transition-colors"
                          data-testid={`button-social-${social.name.toLowerCase()}`}
                        >
                          <Icon className={`${social.color} mr-2 h-4 w-4`} />
                          <span className="text-sm font-medium">{social.name}</span>
                        </Button>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">주요 기능</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              현대 기술과 전통적인 성경 필사의 영성을 결합한 종합 플랫폼
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="text-primary h-6 w-6" />
                    </div>
                    <h4 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bible-texture">
        <div className="container px-4 mx-auto max-w-4xl text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            오늘부터 시작하세요
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            전 세계 성도들과 함께하는 성경 필사 여정에 참여하여 
            말씀 안에서 더 깊은 성장을 경험하세요
          </p>
          <a href="/api/login">
            <Button size="lg" className="h-12 px-8 text-lg font-semibold" data-testid="button-cta-start">
              <Trophy className="mr-2 h-5 w-5" />
              무료로 시작하기
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/30 border-t border-border py-16">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">성경필사</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                말씀을 마음에 새기는 디지털 성경 필사 플랫폼으로 
                전 세계 성도들과 함께 성장하세요.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-foreground">서비스</h5>
              <nav className="space-y-2">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">필사하기</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">리더보드</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">챌린지</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">교회 등록</a>
              </nav>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-foreground">지원</h5>
              <nav className="space-y-2">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">도움말</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">문의하기</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">피드백</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">기술 지원</a>
              </nav>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-foreground">회사</h5>
              <nav className="space-y-2">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">소개</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">개인정보처리방침</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">서비스 이용약관</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">채용</a>
              </nav>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground">
              © 2024 성경필사. 모든 권리 보유. Made with ❤️ for God's Kingdom
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
