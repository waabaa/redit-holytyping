import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  // 테스트 환경 설정
  process.env.NODE_ENV = 'test';
  console.log('🧪 테스트 환경 설정 완료');
});

afterAll(async () => {
  // 정리 작업
  console.log('🧹 테스트 환경 정리 완료');
});