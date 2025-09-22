import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, CheckCircle } from "lucide-react";
import type { BibleVerse } from "@shared/schema";

interface TypingPracticeProps {
  verse: BibleVerse;
  language: string;
  bookName: string;
  onComplete: (wpm: number, accuracy: number, wordsTyped: number, timeSpent: number) => void;
}

const languageOptions = [
  { code: "ko", name: "한국어", field: "textKo" },
  { code: "en", name: "English", field: "textEn" },
  { code: "zh", name: "中文", field: "textZh" },
  { code: "ja", name: "日本語", field: "textJa" },
];

export default function TypingPractice({ verse, language, bookName, onComplete }: TypingPracticeProps) {
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getText = () => {
    // All translations use the 'content' field from the database
    return verse.content || "";
  };

  const targetText = getText();
  const progress = targetText ? (userInput.length / targetText.length) * 100 : 0;

  const calculateStats = useCallback(() => {
    if (!targetText || !startTime) return { wpm: 0, accuracy: 100 };

    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const wordsTyped = userInput.length / 5; // standard word length
    const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;

    let correctChars = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (i < targetText.length && userInput[i] === targetText[i]) {
        correctChars++;
      }
    }
    const accuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;

    return { wpm, accuracy };
  }, [userInput, targetText, startTime]);

  useEffect(() => {
    const stats = calculateStats();
    setCurrentWpm(stats.wpm);
    setCurrentAccuracy(stats.accuracy);
  }, [calculateStats]);

  useEffect(() => {
    if (userInput === targetText && targetText && !isCompleted) {
      setIsCompleted(true);
      const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      const stats = calculateStats();
      const wordsTyped = Math.round(userInput.length / 5);
      onComplete(stats.wpm, stats.accuracy, wordsTyped, timeSpent);
    }
  }, [userInput, targetText, isCompleted, startTime, calculateStats, onComplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    if (!startTime) {
      setStartTime(Date.now());
    }

    // Prevent typing beyond target text length
    if (value.length <= targetText.length) {
      setUserInput(value);
    }
  };

  const handleReset = () => {
    setUserInput("");
    setStartTime(null);
    setIsCompleted(false);
    setCurrentWpm(0);
    setCurrentAccuracy(100);
    textareaRef.current?.focus();
  };

  const renderTextWithHighlight = () => {
    if (!targetText) return null;

    return (
      <div className="font-mono text-lg leading-relaxed p-4 bg-muted/30 rounded-lg border min-h-[120px]" data-testid="text-target">
        {targetText.split('').map((char: string, index: number) => {
          let className = "";
          
          if (index < userInput.length) {
            className = userInput[index] === char ? "typing-correct" : "typing-incorrect";
          } else if (index === userInput.length) {
            className = "typing-cursor";
          }
          
          return (
            <span key={index} className={className}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Verse Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {bookName} {verse.chapter}:{verse.verse}
              </CardTitle>
              <Badge variant="secondary" className="mt-2">
                {languageOptions.find(l => l.code === language)?.name}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!userInput}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              다시 시작
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-medium text-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-primary" data-testid="stat-wpm">
                  {currentWpm}
                </div>
                <div className="text-sm text-muted-foreground">WPM</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-accent" data-testid="stat-accuracy">
                  {currentAccuracy}%
                </div>
                <div className="text-sm text-muted-foreground">정확도</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typing Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            필사 영역
            {isCompleted && (
              <CheckCircle className="h-5 w-5 ml-2 text-green-500" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Text */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">대상 텍스트:</h4>
            {renderTextWithHighlight()}
          </div>

          <Separator />

          {/* Input Area */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">여기에 타이핑하세요:</h4>
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleInputChange}
              className="w-full h-32 p-4 border border-input rounded-lg bg-background text-foreground font-mono text-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="위 텍스트를 정확히 입력하세요..."
              disabled={isCompleted}
              autoFocus
              data-testid="textarea-input"
            />
          </div>

          {isCompleted && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">완료!</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                성경 필사를 완료하셨습니다. 결과가 자동으로 저장됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
