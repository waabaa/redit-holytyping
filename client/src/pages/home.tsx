import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, TrendingUp, Target, RotateCcw, LogIn, CheckCircle, Trophy, Calendar, Users, Type, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import StatsDisplay from "@/components/stats-display";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { BibleVerse, Translation, BibleBook, Language } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Demo page states - completely redesigned for broad random selection
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState<Translation | null>(null);
  const [currentBook, setCurrentBook] = useState<BibleBook | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [verseInputs, setVerseInputs] = useState<{[key: number]: string}>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, completed: 0 });

  // Font settings states
  const [fontFamily, setFontFamily] = useState<string>('노토 산스');
  const [fontSize, setFontSize] = useState<number>(14);
  
  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  
  // Debouncing for getNewChapter to prevent server overload
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Available fonts (Korean-optimized Google Fonts - Free License)
  const availableFonts = useMemo(() => [
    { name: '노토 산스', family: 'Noto Sans KR, sans-serif', original: 'Noto Sans KR' },
    { name: '노토 세리프', family: 'Noto Serif KR, serif', original: 'Noto Serif KR' },
    { name: '나눔고딕', family: 'Nanum Gothic, sans-serif', original: 'Nanum Gothic' },
    { name: '나눔명조', family: 'Nanum Myeongjo, serif', original: 'Nanum Myeongjo' },
    { name: '도현체', family: 'Do Hyeon, sans-serif', original: 'Do Hyeon' },
    { name: '주아체', family: 'Jua, sans-serif', original: 'Jua' },
    { name: '감자꽃체', family: 'Gamja Flower, cursive', original: 'Gamja Flower' },
    { name: '싱글데이', family: 'Single Day, cursive', original: 'Single Day' },
    { name: '고운돋움', family: 'Gowun Dodum, sans-serif', original: 'Gowun Dodum' },
    { name: '고운바탕', family: 'Gowun Batang, serif', original: 'Gowun Batang' }
  ], []);

  // Font settings management
  const saveFontSettings = useCallback((family: string, size: number) => {
    localStorage.setItem('bible-font-settings', JSON.stringify({ fontFamily: family, fontSize: size }));
  }, []);

  const loadFontSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('bible-font-settings');
      if (saved) {
        const { fontFamily: savedFamily, fontSize: savedSize } = JSON.parse(saved);
        if (savedFamily) {
          // Convert original font name to Korean name for display
          const matchedFont = availableFonts.find(font => font.original === savedFamily);
          const displayName = matchedFont ? matchedFont.name : savedFamily;
          setFontFamily(displayName);
        }
        if (savedSize && savedSize >= 10 && savedSize <= 24) setFontSize(savedSize);
      }
    } catch (error) {
      console.error('Failed to load font settings:', error);
    }
  }, [availableFonts]);

  const handleFontFamilyChange = useCallback((newFamily: string) => {
    setFontFamily(newFamily);
    // Find the original font name to save to localStorage
    const selectedFont = availableFonts.find(font => font.name === newFamily);
    const originalName = selectedFont ? selectedFont.original : newFamily;
    saveFontSettings(originalName, fontSize);
  }, [fontSize, saveFontSettings, availableFonts]);

  const handleFontSizeChange = useCallback((newSize: number) => {
    const clampedSize = Math.max(10, Math.min(24, newSize)); // 10px to 24px range
    setFontSize(clampedSize);
    // Find the original font name to save to localStorage
    const selectedFont = availableFonts.find(font => font.name === fontFamily);
    const originalName = selectedFont ? selectedFont.original : fontFamily;
    saveFontSettings(originalName, clampedSize);
  }, [fontFamily, saveFontSettings, availableFonts]);

  // Refs for perfect scroll synchronization
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Authenticated user queries
  const { data: challenges } = useQuery<any[]>({
    queryKey: ["/api/challenges"],
    enabled: isAuthenticated,
  });

  const { data: userStats } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: personalLeaderboard } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/personal"],
    enabled: isAuthenticated,
  });

  const { data: userChurch } = useQuery<any>({
    queryKey: ["/api/user/church"],
    enabled: isAuthenticated,
  });

  // 📦 클라이언트 캐싱 시스템
  const saveBibleDataToCache = useCallback((data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: '1.0', // 데이터 구조 변경 시 버전 업
      };
      localStorage.setItem('bible-cache', JSON.stringify(cacheData));
      console.log('✅ 성경 데이터 캐시 저장됨');
    } catch (error) {
      console.warn('캐시 저장 실패:', error);
    }
  }, []);

  const loadBibleDataFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem('bible-cache');
      if (cached) {
        const { data, timestamp, version } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > 1000 * 60 * 60 * 24; // 24시간
        const isOldVersion = version !== '1.0';
        
        if (!isExpired && !isOldVersion) {
          console.log('⚡ 캐시된 데이터로 즉시 로딩!');
          return data;
        } else {
          localStorage.removeItem('bible-cache');
          console.log('⚠️ 만료된 캐시 삭제됨');
        }
      }
    } catch (error) {
      console.warn('캐시 로드 실패:', error);
      localStorage.removeItem('bible-cache');
    }
    return null;
  }, []);

  // 🚀 캐시 우선 전략: 캐시가 있으면 즉시 사용하고 네트워크 호출 건너뛰기
  const [cachedData] = useState<{
    languages: Language[];
    koreanTranslations: Translation[];
    books: BibleBook[];
    defaultVerse: BibleVerse | null;
    defaultTranslation: Translation | null;
    popularChapters: BibleVerse[][];
  } | null>(() => {
    // 컴포넌트 마운트 시 즉시 캐시 확인
    if (typeof window !== 'undefined') {
      const cached = loadBibleDataFromCache();
      if (cached) {
        console.log('🚀 캐시 발견! 즉시 화면 렌더링');
        return cached;
      }
    }
    return null;
  });

  // ⚡ 캐시 우선 전략: 캐시가 있으면 네트워크 호출 건너뛰기
  const { data: initialData, isLoading: loadingInitialData } = useQuery<{
    languages: Language[];
    koreanTranslations: Translation[];
    books: BibleBook[];
    defaultVerse: BibleVerse | null;
    defaultTranslation: Translation | null;
    popularChapters: BibleVerse[][];
  }>({
    queryKey: ['/api/bible/initial-data'],
    enabled: !isAuthenticated && !cachedData, // 캐시가 있으면 네트워크 호출 건너뛰기
    initialData: cachedData || undefined, // 캐시된 데이터를 초기값으로 사용
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });

  // 기본값으로 즉시 설정하여 추가 API 호출 방지
  const languages = initialData?.languages;
  const translations = initialData?.koreanTranslations;
  const books = initialData?.books;

  const { data: chapterVerses, isLoading: loadingChapter } = useQuery<BibleVerse[]>({
    queryKey: ['/api/bible/chapter', currentBook?.id, currentChapter, currentTranslation?.id],
    queryFn: () => {
      // 번역본 ID가 확실히 있을 때만 API 호출
      if (!currentTranslation?.id) {
        throw new Error("번역본 ID가 필요합니다");
      }
      console.log(`🔍 API 호출: 책=${currentBook?.bookNameKr}, 장=${currentChapter}, 번역본=${currentTranslation.name} (${currentTranslation.id})`);
      return fetch(`/api/bible/chapter/${currentBook?.id}/${currentChapter}?translationId=${currentTranslation.id}`).then(res => res.json());
    },
    enabled: !isAuthenticated && 
             !!currentBook && 
             !!currentTranslation && 
             !!currentTranslation.id && 
             currentTranslation.code === 'GAEREVIS', // 개역개정만 허용
    staleTime: 1000 * 60 * 60 * 24, // 24시간 캐시
  });


  // Load font settings on component mount
  useEffect(() => {
    loadFontSettings();
  }, [loadFontSettings]);

  // ⚡ 캐시 또는 서버 데이터를 통합하여 즉시 기본값 설정
  const effectiveData = cachedData || initialData;
  
  useEffect(() => {
    if (!isAuthenticated && effectiveData) {
      const { languages, koreanTranslations, books, defaultTranslation, popularChapters } = effectiveData as {
        languages: Language[];
        koreanTranslations: Translation[];
        books: BibleBook[];
        defaultTranslation: Translation | null;
        popularChapters: BibleVerse[][];
      };
      
      // 📦 새로운 서버 데이터만 캐시 저장 (캐시에서 온 데이터는 이미 저장됨)
      if (!cachedData && initialData) {
        saveBibleDataToCache(initialData);
      }
      
      // 1. 한국어 언어 설정
      if (!currentLanguage && languages.length > 0) {
        const koreanLanguage = languages.find((lang: Language) => lang.code === 'ko');
        if (koreanLanguage) {
          setCurrentLanguage(koreanLanguage);
          console.log(cachedData ? '⚡ 캐시: 한국어 설정됨' : '✅ 서버: 한국어 설정됨', koreanLanguage.name);
        } else {
          setCurrentLanguage(languages[0]);
        }
      }

      // 2. 개역개정 번역본 즉시 설정
      if (!currentTranslation && koreanTranslations.length > 0) {
        if (defaultTranslation) {
          setCurrentTranslation(defaultTranslation);
          console.log(cachedData ? '⚡ 캐시: 번역본 설정됨' : '✅ 서버: 번역본 설정됨', defaultTranslation.name);
        } else {
          const gaerevisTranslation = koreanTranslations.find((t: Translation) => t.code === 'GAEREVIS');
          const fallback = gaerevisTranslation || koreanTranslations[0];
          if (fallback) {
            setCurrentTranslation(fallback);
            console.log(cachedData ? '⚡ 캐시: 폴백 번역본 설정됨' : '✅ 서버: 폴백 번역본 설정됨', fallback.name);
          }
        }
      }

      // 3. 랜덤 책과 장 선택 (창세기~요한계시록)
      if (!currentBook && books.length > 0) {
        const canonicalBooks = books.filter((book: BibleBook) => book.bookOrder >= 1 && book.bookOrder <= 66);
        
        if (canonicalBooks.length > 0) {
          const randomBook = canonicalBooks[Math.floor(Math.random() * canonicalBooks.length)];
          const randomChapter = Math.floor(Math.random() * 10) + 1;
          
          setCurrentBook(randomBook);
          setCurrentChapter(randomChapter);
          console.log(cachedData ? '⚡ 캐시: 랜덤 책 설정됨' : '✅ 서버: 랜덤 책 설정됨', randomBook.bookNameKr, randomChapter + '장');
        } else {
          setCurrentBook(books[0]);
          setCurrentChapter(1);
        }
      }

      // 🚀 프리페칭된 인기 구절들 로그
      if (popularChapters && popularChapters.length > 0) {
        console.log(cachedData ? '⚡ 캐시:' : '🚀 서버:', `${popularChapters.length}개 인기 장 로드됨`);
      }
    }
  }, [effectiveData, currentLanguage, currentTranslation, currentBook, isAuthenticated, cachedData, initialData, saveBibleDataToCache]);

  // Calculate typing stats
  const calculateStats = useCallback(() => {
    if (!chapterVerses || !startTime) return;

    const now = Date.now();
    const timeMinutes = (now - startTime) / 60000;
    let totalChars = 0;
    let correctChars = 0;
    let completedVerses = 0;

    chapterVerses.forEach(verse => {
      const input = verseInputs[verse.verse] || '';
      totalChars += input.length;
      
      for (let i = 0; i < input.length; i++) {
        if (input[i] === verse.content[i]) correctChars++;
      }
      
      if (input === verse.content) completedVerses++;
    });

    const wpm = timeMinutes > 0 ? Math.round((totalChars / 5) / timeMinutes) : 0;
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
    const completed = Math.round((completedVerses / chapterVerses.length) * 100);

    setStats({ wpm, accuracy, completed });
  }, [chapterVerses, verseInputs, startTime]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Handle verse input
  const handleVerseInput = (verseNumber: number, value: string) => {
    if (!startTime) setStartTime(Date.now());
    
    const verse = chapterVerses?.find(v => v.verse === verseNumber);
    if (!verse || value.length > verse.content.length) return;

    setVerseInputs(prev => ({ ...prev, [verseNumber]: value }));
  };

  // Debounced version of getNewChapter to prevent server overload
  const debouncedGetNewChapter = () => {
    // Clear previous timer if exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer - execute after 1 second
    debounceTimerRef.current = setTimeout(() => {
      getNewChapter();
    }, 1000);
  };

  // Get new random chapter - FIXED: 한국어/개역개정으로 고정, 실제 장 범위 동적 확인
  const getNewChapter = async () => {
    if (!languages || !books || !translations) return;
    
    // Reset input states only
    setVerseInputs({});
    setStartTime(null);
    setStats({ wpm: 0, accuracy: 100, completed: 0 });
    
    // 1. 한국어 언어 유지 (고정)
    const koreanLanguage = languages.find(lang => lang.code === 'ko');
    if (!koreanLanguage) return;
    
    // 2. 개역개정 번역본 유지 (고정)  
    const gaerevisTranslation = translations.find(t => t.code === 'GAEREVIS');
    if (!gaerevisTranslation) return;
    
    // 3. 창세기~요한계시록(1-66) 중 랜덤 책 선택
    const canonicalBooks = books.filter(book => 
      book.bookOrder >= 1 && book.bookOrder <= 66
    );
    
    if (canonicalBooks.length === 0) return;
    
    // 4. 유효한 책과 장을 찾을 때까지 시도 (최대 10번)
    let attempts = 0;
    while (attempts < 10) {
      const randomBook = canonicalBooks[Math.floor(Math.random() * canonicalBooks.length)];
      
      try {
        // 5. 실제 데이터베이스에서 해당 책의 최대 장수 확인
        const maxChapterResponse = await fetch(`/api/bible/book/${randomBook.id}/max-chapter?translationId=${gaerevisTranslation.id}`);
        const maxChapterData = await maxChapterResponse.json();
        
        const maxChapter = maxChapterData.maxChapter || 1;
        const randomChapter = Math.floor(Math.random() * maxChapter) + 1;
        
        // 6. 해당 장에 실제 구절이 있는지 확인
        const verseCheckResponse = await fetch(`/api/bible/chapter/${randomBook.id}/${randomChapter}?translationId=${gaerevisTranslation.id}`);
        const verses = await verseCheckResponse.json();
        
        if (verses && verses.length > 0) {
          // 유효한 장을 찾았으므로 상태 업데이트
          console.log(`✅ 유효한 장 발견: ${randomBook.bookNameKr} ${randomChapter}장 (${verses.length}개 구절)`);
          setCurrentLanguage(koreanLanguage);
          setCurrentTranslation(gaerevisTranslation); 
          setCurrentBook(randomBook);
          setCurrentChapter(randomChapter);
          return;
        }
      } catch (error) {
        console.error(`❌ 장 확인 실패: ${randomBook.bookNameKr}`, error);
      }
      
      attempts++;
    }
    
    // 10번 시도해도 못 찾으면 기본값으로 창세기 1장
    console.log('⚠️ 유효한 장을 찾지 못해 창세기 1장으로 기본 설정');
    const genesisBook = books.find(book => book.bookCode === 'gen');
    if (genesisBook) {
      setCurrentLanguage(koreanLanguage);
      setCurrentTranslation(gaerevisTranslation); 
      setCurrentBook(genesisBook);
      setCurrentChapter(1);
    }
  };

  // Synchronize scrolling between left and right pages
  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncing.current || !rightScrollRef.current) return;
    isSyncing.current = true;
    rightScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    setTimeout(() => { isSyncing.current = false; }, 0);
  };

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncing.current || !leftScrollRef.current) return;
    isSyncing.current = true;
    leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    setTimeout(() => { isSyncing.current = false; }, 0);
  };

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Demo page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950">
        {/* Simple Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold font-serif">성경 필사 체험</h1>
                  <p className="text-amber-100 text-sm">
                    {currentBook && currentTranslation ? 
                      `${currentBook.bookNameKr} ${currentChapter}장 (${currentTranslation.name})` : 
                      '성경을 불러오는 중...'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                {/* Stats */}
                {startTime && (
                  <div className="flex items-center gap-4 bg-white/10 px-3 py-1 rounded-lg">
                    <span><TrendingUp className="h-4 w-4 inline mr-1" />속도 {stats.wpm}</span>
                    <span><Target className="h-4 w-4 inline mr-1" />정확도 {stats.accuracy}%</span>
                    <span><CheckCircle className="h-4 w-4 inline mr-1" />진행률 {stats.completed}%</span>
                  </div>
                )}
                
                {/* Font Settings */}
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                  <Type className="h-3 w-3" />
                  <Select 
                    value={fontFamily} 
                    onValueChange={handleFontFamilyChange}
                  >
                    <SelectTrigger className="h-6 w-32 text-xs bg-transparent border-white/30 text-white hover:bg-white/10" data-testid="select-font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-orange-200 shadow-lg">
                      {availableFonts.map(font => (
                        <SelectItem 
                          key={font.name} 
                          value={font.name} 
                          className="text-orange-900 hover:bg-orange-100 focus:bg-orange-100 hover:text-orange-900 focus:text-orange-900"
                          data-testid={`font-option-${font.name.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          <span style={{ fontFamily: font.family }}>
                            {font.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => handleFontSizeChange(fontSize - 1)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white hover:bg-white/10"
                      disabled={fontSize <= 10}
                      data-testid="button-decrease-font-size"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs min-w-[2rem] text-center" data-testid="text-font-size">
                      {fontSize}px
                    </span>
                    <Button
                      onClick={() => handleFontSizeChange(fontSize + 1)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white hover:bg-white/10"
                      disabled={fontSize >= 24}
                      data-testid="button-increase-font-size"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Buttons */}
                <Button
                  onClick={debouncedGetNewChapter}
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  data-testid="button-new-chapter"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />새로운 필사
                </Button>
                
              </div>
            </div>
          </div>
        </div>

        {/* Bible Book */}
        <div className="flex justify-center py-8 px-4">
          <div className="bible-book rounded-lg max-w-6xl w-full mx-auto">
            
            {!currentBook || !chapterVerses || !currentTranslation ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  {loadingChapter ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                      <p className="text-amber-700 dark:text-amber-300">성경을 불러오는 중...</p>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                      <p className="text-amber-700 dark:text-amber-300 text-lg">성경을 준비하는 중입니다...</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full">
                {/* Left Page - Bible Text */}
                <div className="flex-1 bible-page p-8 h-full overflow-hidden">
                  <div className="h-full flex flex-col">
                    <div className="chapter-header text-center mb-6">
                      <h2 className="text-xl font-bold text-amber-800 dark:text-amber-200 font-serif">
                        {currentBook.bookNameKr} {currentChapter}장
                      </h2>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {currentTranslation.name} ({currentLanguage?.name})
                      </p>
                    </div>
                    
                    <div 
                      ref={leftScrollRef}
                      className="flex-1"
                    >
                      {chapterVerses.map(verse => {
                        const selectedFont = availableFonts.find(font => font.name === fontFamily);
                        const fontFamilyStyle = selectedFont?.family || 'Noto Sans KR, sans-serif';
                        
                        return (
                          <div key={verse.id ?? `${verse.bookId}-${verse.chapter}-${verse.verse}`} className="verse-container" data-testid={`verse-display-${verse.verse}`}>
                            <div className="verse-line flex items-start text-gray-800 dark:text-gray-200" style={{
                              lineHeight: '1.8',
                              paddingTop: '2px',
                              paddingBottom: '2px',
                              minHeight: 'calc(1.8em + 4px)',
                              fontFamily: fontFamilyStyle,
                              fontSize: `${fontSize}px`
                            }}>
                              <span className="verse-number flex-shrink-0 font-medium text-amber-600 dark:text-amber-400" style={{
                                width: '32px',
                                marginRight: '12px',
                                paddingTop: '2px',
                                fontFamily: fontFamilyStyle,
                                fontSize: `${fontSize}px`
                              }}>
                                {verse.verse}
                              </span>
                              <div className="verse-content flex-1" style={{
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.8',
                                fontFamily: fontFamilyStyle,
                                fontSize: `${fontSize}px`
                              }}>
                                {verse.content}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Center Binding */}
                <div className="bible-binding w-4 flex-shrink-0"></div>

                {/* Right Page - Input with Perfect Alignment */}
                <div className="flex-1 bible-page p-8 h-full overflow-hidden">
                  <div className="h-full flex flex-col">
                    <div className="chapter-header text-center mb-6">
                      <h2 className="text-xl font-bold text-amber-800 dark:text-amber-200 font-serif">
                        필사 연습
                      </h2>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        정확히 입력하세요
                      </p>
                    </div>
                    
                    <div 
                      ref={rightScrollRef}
                      className="flex-1"
                    >
                      {chapterVerses.map(verse => {
                        const userInput = verseInputs[verse.verse] || '';
                        const verseHeight = 'calc(1.8em + 4px)';
                        const selectedFont = availableFonts.find(font => font.name === fontFamily);
                        const fontFamilyStyle = selectedFont?.family || 'Noto Sans KR, sans-serif';
                        
                        return (
                          <div key={verse.id ?? `${verse.bookId}-${verse.chapter}-${verse.verse}`} className="verse-container" data-testid={`verse-input-${verse.verse}`}>
                            <div className="verse-line flex items-start" style={{
                              lineHeight: '1.8',
                              paddingTop: '2px',
                              paddingBottom: '2px',
                              minHeight: verseHeight,
                              fontFamily: fontFamilyStyle,
                              fontSize: `${fontSize}px`
                            }}>
                              <span className="verse-number flex-shrink-0 font-medium text-amber-600 dark:text-amber-400" style={{
                                width: '32px',
                                marginRight: '12px',
                                paddingTop: '2px',
                                fontFamily: fontFamilyStyle,
                                fontSize: `${fontSize}px`
                              }}>
                                {verse.verse}
                              </span>
                              <div className="verse-input-area flex-1 relative">
                                {/* Perfect sizing reference - invisible background */}
                                <div 
                                  className="sizing-reference text-transparent select-none pointer-events-none"
                                  style={{
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.8',
                                    fontFamily: fontFamilyStyle,
                                    fontSize: `${fontSize}px`
                                  }}
                                >
                                  {verse.content}
                                </div>
                                
                                {/* Character-by-character feedback overlay - BEHIND textarea */}
                                {userInput && (
                                  <div 
                                    className="feedback-overlay absolute pointer-events-none"
                                    style={{
                                      top: '2px',
                                      left: '2px',
                                      right: '2px',
                                      bottom: '2px',
                                      wordBreak: 'break-word',
                                      whiteSpace: 'pre-wrap',
                                      lineHeight: '1.8',
                                      fontFamily: fontFamilyStyle,
                                      fontSize: `${fontSize}px`,
                                      zIndex: 1
                                    }}
                                  >
                                    {verse.content.split('').map((char, i) => {
                                      const userChar = userInput[i];
                                      let bgColor = 'transparent';
                                      
                                      if (i < userInput.length) {
                                        bgColor = userChar === char ? 
                                          'rgba(34, 197, 94, 0.3)' : // green for correct
                                          'rgba(239, 68, 68, 0.3)';   // red for incorrect
                                      } else if (i === userInput.length) {
                                        bgColor = 'rgba(59, 130, 246, 0.4)'; // blue cursor
                                      }
                                      
                                      return (
                                        <span key={`${verse.id || 'verse'}-${verse.verse || 'v'}-char-${i}`} style={{ backgroundColor: bgColor, color: 'transparent' }}>
                                          {char}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Input textarea with OPAQUE background to hide original text */}
                                <textarea
                                  value={userInput}
                                  onChange={(e) => handleVerseInput(verse.verse, e.target.value)}
                                  onPaste={(e) => e.preventDefault()}
                                  onDrop={(e) => e.preventDefault()}
                                  onDragOver={(e) => e.preventDefault()}
                                  onContextMenu={(e) => e.preventDefault()}
                                  placeholder="여기에 입력하세요..."
                                  className="absolute inset-0 w-full h-full border border-amber-200 dark:border-amber-800 rounded-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-400 dark:focus:border-amber-600 focus:outline-none resize-none bg-white dark:bg-gray-900"
                                  style={{
                                    lineHeight: '1.8',
                                    padding: '2px',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: fontFamilyStyle,
                                    fontSize: `${fontSize}px`,
                                    zIndex: 2
                                  }}
                                  data-testid={`textarea-verse-${verse.verse}`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user home page
  const activeChallenges = (challenges && Array.isArray(challenges)) ? challenges.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            성경 필사로 말씀을 마음에 새기세요
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            타이핑을 통해 성경을 읽고, 속도와 정확도를 향상시키며, 교회 공동체와 함께 성장하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/practice">
              <Button size="lg" className="min-w-40" data-testid="button-start-practice">
                <BookOpen className="mr-2 h-5 w-5" />
                연습 시작하기
              </Button>
            </Link>
            <Link href="/challenges">
              <Button variant="outline" size="lg" className="min-w-40" data-testid="button-view-challenges">
                <Trophy className="mr-2 h-5 w-5" />
                도전과제 보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* User Stats */}
      {userStats && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">나의 성과</h2>
            <StatsDisplay stats={userStats} />
          </div>
        </section>
      )}

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <section className="py-12 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">활성 도전과제</h2>
              <Link href="/challenges">
                <Button variant="outline" size="sm" data-testid="button-view-all-challenges">
                  모든 도전과제 보기
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeChallenges.map((challenge: any, index: number) => (
                <div key={challenge.id || `challenge-${index}`} className="bg-card rounded-lg border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg line-clamp-2">{challenge.title}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      challenge.type === 'daily' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      challenge.type === 'weekly' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {challenge.type === 'daily' ? '일간' : challenge.type === 'weekly' ? '주간' : '월간'}
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {challenge.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Target className="h-4 w-4" />
                        <span>{challenge.requiredAccuracy}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{challenge.requiredWpm} WPM</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                      <Trophy className="h-4 w-4" />
                      <span>{challenge.pointsReward}p</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Personal Leaderboard */}
      {personalLeaderboard && Array.isArray(personalLeaderboard) && personalLeaderboard.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">개인 순위</h2>
              <Link href="/leaderboard">
                <Button variant="outline" size="sm" data-testid="button-view-leaderboard">
                  전체 순위 보기
                </Button>
              </Link>
            </div>
            
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="font-semibold">상위 사용자</h3>
              </div>
              <div className="divide-y">
                {personalLeaderboard.slice(0, 5).map((entry: any, index: number) => (
                  <div key={entry.userId || entry.id || `leaderboard-${index}`} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                        index === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{entry.firstName || '익명'} {entry.lastName || ''}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.totalWords?.toLocaleString() || 0} 단어
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{entry.totalPoints?.toLocaleString() || 0}점</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(entry.averageWpm || 0)} WPM
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Church Section */}
      {userChurch && typeof userChurch === 'object' && (
        <section className="py-12 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">내 교회</h2>
              <p className="text-muted-foreground">{(userChurch as any).name}</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-card rounded-lg border p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">교인 수</h3>
                <p className="text-2xl font-bold">{(userChurch as any).totalMembers || 0}</p>
              </div>
              
              <div className="bg-card rounded-lg border p-6 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">교회 점수</h3>
                <p className="text-2xl font-bold">{((userChurch as any).totalPoints || 0).toLocaleString()}</p>
              </div>
              
              <div className="bg-card rounded-lg border p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">생성일</h3>
                <p className="text-sm text-muted-foreground">
                  {(userChurch as any).createdAt ? new Date((userChurch as any).createdAt).toLocaleDateString('ko-KR') : '알 수 없음'}
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Link href={`/churches/${(userChurch as any).id}`}>
                <Button variant="outline" data-testid="button-view-church">
                  교회 상세 보기
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">지금 시작하세요</h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            매일 조금씩 연습하며 성경 말씀을 마음에 새기고, 타이핑 실력도 함께 향상시켜보세요.
          </p>
          <Link href="/practice">
            <Button size="lg" variant="secondary" data-testid="button-cta-practice">
              <BookOpen className="mr-2 h-5 w-5" />
              연습 시작하기
            </Button>
          </Link>
        </div>
      </section>

      {/* Authentication Modal */}
      <AuthModal 
        open={isLoginModalOpen} 
        onOpenChange={setIsLoginModalOpen} 
      />
    </div>
  );
}