import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, RotateCcw, Globe, Play, Pause, CheckCircle, Clock } from "lucide-react";
import TypingPractice from "@/components/typing-practice";
import type { BibleVerse, BibleBook, Translation } from "@shared/schema";

const languageOptions = [
  { code: "ko", name: "한국어" },
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
];

export default function Practice() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Selection states
  const [selectedLanguage, setSelectedLanguage] = useState("ko");
  const [selectedTranslation, setSelectedTranslation] = useState<string>("");
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  
  // Debouncing for handleRandomVerse to prevent server overload
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Typing states
  const [isTypingMode, setIsTypingMode] = useState(false);

  // Queries
  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/bible/books"],
  });

  const { data: translations } = useQuery<Translation[]>({
    queryKey: [`/api/bible/translations?language=${selectedLanguage}`],
    enabled: !!selectedLanguage,
  });

  const { data: chapterVerses, isLoading: isLoadingChapter } = useQuery<BibleVerse[]>({
    queryKey: [`/api/bible/chapter/${selectedBook}/${selectedChapter}?translationId=${selectedTranslation}`],
    enabled: !!selectedBook && !!selectedTranslation,
  });

  const { data: randomVerse, refetch: refetchRandomVerse } = useQuery<BibleVerse>({
    queryKey: [`/api/bible/random-verse?translationId=${selectedTranslation}`],
    enabled: !!selectedTranslation,
  });

  // Set default translation when translations are loaded
  useEffect(() => {
    if (translations && translations.length > 0 && !selectedTranslation) {
      if (selectedLanguage === "ko") {
        // Try GAEREVIS first (has more complete verse data), then GAE, then fallback to first
        const defaultTranslation = translations.find((t: Translation) => t.code === "GAEREVIS") || 
                                  translations.find((t: Translation) => t.code === "GAE") || 
                                  translations[0];
        setSelectedTranslation(defaultTranslation.id);
      } else {
        setSelectedTranslation(translations[0].id);
      }
    }
  }, [translations, selectedLanguage, selectedTranslation]);

  // Session creation mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      await apiRequest("POST", "/api/typing/session", sessionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/typing/sessions"] });
      toast({
        title: "완료!",
        description: "타이핑 세션이 성공적으로 기록되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "로그인 후 다시 시도해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "세션 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setSelectedTranslation("");
    setSelectedBook("");
    setSelectedVerse(null);
    setIsTypingMode(false);
  };

  const handleTranslationChange = (translationId: string) => {
    setSelectedTranslation(translationId);
    setSelectedBook("");
    setSelectedVerse(null);
    setIsTypingMode(false);
  };

  const handleBookChange = (bookId: string) => {
    setSelectedBook(bookId);
    setSelectedChapter(1);
    setSelectedVerse(null);
    setIsTypingMode(false);
  };

  const handleChapterChange = (chapter: number) => {
    setSelectedChapter(chapter);
    setSelectedVerse(null);
    setIsTypingMode(false);
  };

  const handleVerseSelect = (verse: BibleVerse) => {
    setSelectedVerse(verse);
    setIsTypingMode(false);
  };

  // Debounced version of handleRandomVerse to prevent server overload
  const debouncedHandleRandomVerse = () => {
    // Clear previous timer if exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer - execute after 1 second
    debounceTimerRef.current = setTimeout(() => {
      handleRandomVerse();
    }, 1000);
  };

  const handleRandomVerse = () => {
    if (randomVerse) {
      setSelectedVerse(randomVerse);
      setIsTypingMode(false);
      refetchRandomVerse();
    }
  };

  const handleStartTyping = () => {
    if (!selectedVerse) return;
    setIsTypingMode(true);
  };

  const handleTypingComplete = (wpm: number, accuracy: number, wordsTyped: number, timeSpent: number) => {
    if (!selectedVerse || !isAuthenticated) return;

    const pointsEarned = Math.round((wpm * accuracy / 100) * 0.1);

    createSessionMutation.mutate({
      verseId: selectedVerse.id,
      wpm,
      accuracy,
      wordsTyped,
      timeSpent,
      pointsEarned,
    });

    setIsTypingMode(false);
  };

  const getBookName = (bookId: string) => {
    if (!books) return "";
    const book = books.find((b: BibleBook) => b.id === bookId);
    if (!book) return "";
    
    if (selectedLanguage === "ko") return book.bookNameKr || book.bookCode;
    if (selectedLanguage === "en") return book.bookNameEn || book.bookCode;
    if (selectedLanguage === "zh") return book.bookNameEn || book.bookCode;
    if (selectedLanguage === "ja") return book.bookNameEn || book.bookCode;
    
    return book.bookCode;
  };

  const getCurrentBookName = () => {
    if (!selectedVerse || !books) return "";
    return getBookName(selectedVerse.bookId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-800 dark:to-orange-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8" />
              <h1 className="text-2xl md:text-3xl font-bold">성경필사</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Panel - Bible Book Style */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 border-b border-amber-200 dark:border-amber-700">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                  <span className="text-amber-800 dark:text-amber-200">구절 선택</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={debouncedHandleRandomVerse}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-800"
                  data-testid="button-random-verse"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  랜덤 구절
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Selection Controls */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 block">번역본</label>
                  {translations && translations.length > 0 && (
                    <Select value={selectedTranslation} onValueChange={handleTranslationChange}>
                      <SelectTrigger className="border-amber-300 dark:border-amber-600" data-testid="select-translation">
                        <SelectValue placeholder="번역본 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {translations.map((translation: Translation) => (
                          <SelectItem key={translation.id} value={translation.id}>
                            {translation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 block">성경</label>
                    <Select value={selectedBook} onValueChange={handleBookChange}>
                      <SelectTrigger className="border-amber-300 dark:border-amber-600" data-testid="select-book">
                        <SelectValue placeholder="성경 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {books?.map((book: BibleBook) => (
                          <SelectItem key={book.id} value={book.id}>
                            {getBookName(book.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 block">장</label>
                    <Select 
                      value={selectedChapter.toString()} 
                      onValueChange={(value) => handleChapterChange(parseInt(value))}
                      disabled={!selectedBook}
                    >
                      <SelectTrigger className="border-amber-300 dark:border-amber-600" data-testid="select-chapter">
                        <SelectValue placeholder="장 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedBook && books && Array.from({ length: books.find((b: BibleBook) => b.id === selectedBook)?.chapters || 1 }, (_, i) => i + 1).map((chapter) => (
                          <SelectItem key={chapter} value={chapter.toString()}>
                            {chapter}장
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Chapter Verses List */}
              {selectedBook && selectedTranslation && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                      {getBookName(selectedBook)} {selectedChapter}장
                    </h3>
                    {isLoadingChapter && <Clock className="h-4 w-4 animate-spin text-amber-600" />}
                  </div>
                  
                  <div className="border border-amber-200 dark:border-amber-700 rounded-lg bg-white/50 dark:bg-amber-950/50">
                    <div className="p-4 space-y-2">
                      {chapterVerses?.map((verse) => (
                        <div
                          key={verse.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                            selectedVerse?.id === verse.id
                              ? 'bg-amber-200 dark:bg-amber-800 border-amber-400 dark:border-amber-600 shadow-md'
                              : 'bg-white/70 dark:bg-amber-950/70 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900'
                          }`}
                          onClick={() => handleVerseSelect(verse)}
                          data-testid={`verse-item-${verse.verse}`}
                        >
                          <div className="flex items-start space-x-3">
                            <Badge 
                              variant="secondary" 
                              className="flex-shrink-0 bg-amber-300 dark:bg-amber-700 text-amber-800 dark:text-amber-200"
                            >
                              {verse.verse}
                            </Badge>
                            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                              {verse.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Center Divider */}
          <div className="hidden lg:flex items-center justify-center">
            <Separator orientation="vertical" className="h-full bg-gradient-to-b from-amber-300 to-orange-300 dark:from-amber-600 dark:to-orange-600 w-1 rounded-full shadow-lg" />
          </div>

          {/* Right Panel - Bible Book Style */}
          <Card className="bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-950 dark:to-yellow-950 border-orange-200 dark:border-orange-800 shadow-2xl lg:-ml-8">
            <CardHeader className="bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 border-b border-orange-200 dark:border-orange-700">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-orange-700 dark:text-orange-300" />
                  <span className="text-orange-800 dark:text-orange-200">필사 연습</span>
                </div>
                {selectedVerse && !isTypingMode && (
                  <Button 
                    onClick={handleStartTyping}
                    className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-800"
                    data-testid="button-start-typing"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    시작하기
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {selectedVerse ? (
                <div className="space-y-6">
                  {/* Verse Display */}
                  {!isTypingMode && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
                          {getCurrentBookName()} {selectedVerse.chapter}:{selectedVerse.verse}
                        </Badge>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-orange-950/80 border-l-4 border-l-orange-500 p-6 rounded-lg shadow-lg">
                        <p className="text-lg leading-relaxed text-orange-900 dark:text-orange-100" data-testid="text-selected-verse">
                          <span className="text-orange-600 dark:text-orange-400 font-semibold mr-3">
                            {selectedVerse.verse}
                          </span>
                          {selectedVerse.content}
                        </p>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">💡 필사 안내</h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• 화면에 표시된 말씀을 정확히 타이핑하세요</li>
                          <li>• 정확도를 우선시하며 천천히 입력하세요</li>
                          <li>• 말씀을 묵상하며 마음에 새겨보세요</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Typing Practice */}
                  {isTypingMode && (
                    <div className="bg-white/90 dark:bg-orange-950/90 rounded-lg p-6 border border-orange-200 dark:border-orange-700">
                      <TypingPractice
                        verse={selectedVerse}
                        language={selectedLanguage}
                        onComplete={handleTypingComplete}
                        bookName={getCurrentBookName()}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-16 w-16 text-orange-300 dark:text-orange-600 mb-4" />
                  <h3 className="text-xl font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    구절을 선택해주세요
                  </h3>
                  <p className="text-orange-600 dark:text-orange-400 max-w-sm">
                    왼쪽에서 성경, 장을 선택한 후 원하는 구절을 클릭하여 필사를 시작하세요.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}