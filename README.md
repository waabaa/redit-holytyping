# Redit HolyTyping 📖✨

한국어 인터페이스를 가진 다국어 성경 타이핑 연습 서비스

## 🎯 프로젝트 개요
**Redit HolyTyping**은 성경 필사를 통한 타이핑 연습과 영성 훈련을 결합한 혁신적인 웹 애플리케이션입니다.

## ✨ 주요 기능
- 📖 **다국어 성경 타이핑**: 한국어, 영어, 중국어, 일본어 지원
- 🏆 **리더보드 & 챌린지**: 개인/교회별 경쟁 시스템
- ⛪ **교회 커뮤니티**: 교회 기반 그룹 활동
- 🔐 **다중 인증**: 소셜 로그인 + 이메일 인증 + 2FA
- 👑 **4단계 관리자 시스템**: 37개 세분화된 권한
- 🎯 **실시간 통계**: 타이핑 속도, 정확도 추적

## 🛠 기술 스택
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth + 소셜 로그인
- **UI**: Tailwind CSS + shadcn/ui

## 🚀 실행 방법
```bash
npm install
npm run dev
```

## 📱 관리자 시스템
4단계 역할 기반 권한:
- **Super Admin**: 전체 권한 (37개)
- **Content Admin**: 콘텐츠 관리
- **User Admin**: 사용자 관리
- **Stats Viewer**: 통계 조회

### 구현 완료 기능 ✅
- [x] 사용자 인증 시스템 (이메일, 소셜, 2FA)
- [x] 4개 언어 성경 타이핑 시스템
- [x] 실시간 통계 추적
- [x] 교회 커뮤니티 기능
- [x] 4단계 관리자 시스템
- [x] 리더보드 및 순위 시스템
- [x] 모바일 반응형 UI

## 📁 프로젝트 구조
```
redit-holytyping/
├── client/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/      # UI 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── hooks/          # 커스텀 훅
│   │   └── lib/            # 유틸리티
├── server/                   # Express 백엔드
├── shared/                   # 공유 타입/스키마
├── migrations/              # 데이터베이스 마이그레이션
└── attached_assets/         # 첨부 파일들
```

## 🔒 보안 기능
- **인증**: JWT 대신 서버 세션 사용
- **권한**: 세분화된 RBAC (Role-Based Access Control)
- **로깅**: 관리자 액션 로깅, 민감한 데이터 마스킹
- **검증**: Zod 스키마 기반 입력 검증

---

*Developed with ❤️ for Bible typing practice*

## 📞 연락처
- **GitHub**: https://github.com/waabaa/redit-holytyping
- **이슈 제보**: [GitHub Issues](https://github.com/waabaa/redit-holytyping/issues)
