import { useState, useEffect, useMemo, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, Download, ChevronRight, ChevronLeft, Clock, HelpCircle, ArrowRight, AlertOctagon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Quiz, Question, Submission, Outcome } from "@/lib/mock-data";

export default function QuizRunner() {
  const [, params] = useRoute("/quiz/:slug");
  const slug = params?.slug;
  
  // Data State
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQId, setCurrentQId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [calculatedValues, setCalculatedValues] = useState<Record<string, any>>({});
  const [quizOutcome, setQuizOutcome] = useState<Outcome | null>(null);
  
  // Lead capture State
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');

  // UI State
  const [status, setStatus] = useState<'landing' | 'running' | 'paywall' | 'results' | 'knockout'>('landing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);

  useEffect(() => {
    const q = storage.getQuizzes().find(q => q.slug === slug);
    if (q) {
      setQuiz(q);
      if (q.questions.length > 0) setCurrentQId(q.questions[0].id);
    }
  }, [slug]);

  if (!quiz) return <div className="min-h-screen flex items-center justify-center">Quiz not found</div>;

  const currentQ = quiz.questions.find(q => q.id === currentQId);
  const progress = quiz.questions.findIndex(q => q.id === currentQId) / quiz.questions.length * 100;

  // --- Logic Engine ---

  const evaluateExpression = (expr: string, context: any) => {
    try {
      // Very naive safe eval replacement for demo. 
      // In prod use a proper parser. 
      // Replacing variables with values from context.
      
      const keys = Object.keys(context).sort((a, b) => b.length - a.length); // match longest keys first
      let parsed = expr;
      
      keys.forEach(k => {
        let val = context[k];
        if (typeof val === 'string' && isNaN(Number(val))) val = `"${val}"`; 
        // Handle undefined/null as 0 for math
        if (val === undefined || val === null) val = 0;
        parsed = parsed.replaceAll(k, String(val));
      });

      // eslint-disable-next-line no-new-func
      return new Function(`return ${parsed}`)();
    } catch (err) {
      console.error(`Error evaluating ${expr}:`, err);
      return null;
    }
  };

  const getContext = () => {
    // Map answer values to keys
    const context: Record<string, any> = {};
    
    quiz.questions.forEach(q => {
      const val = answers[q.id];
      if (q.key) {
        // If option based, try to resolve value number if possible, else raw
        if (['single','dropdown','yes_no','true_false'].includes(q.type)) {
           const opt = q.options?.find(o => o.value == val); // loose equality
           if (opt) {
             // If option value is numeric string, convert
             context[q.key] = !isNaN(Number(opt.value)) ? Number(opt.value) : opt.value;
           } else {
             context[q.key] = !isNaN(Number(val)) ? Number(val) : val;
           }
        } else {
           context[q.key] = !isNaN(Number(val)) ? Number(val) : val;
        }
      }
    });

    // Add calculated fields already computed? 
    // We compute them at the end usually, but for branching we might need them live? 
    // For this version, let's assume Calc fields are end-of-quiz. Branching uses raw answers.
    return context;
  };

  const computeResults = () => {
    // 1. Calculate Fields
    const context = getContext();
    const computed: Record<string, any> = {};
    
    quiz.calculatedFields.forEach(cf => {
      const val = evaluateExpression(cf.expression, { ...context, ...computed });
      computed[cf.key] = val;
    });
    setCalculatedValues(computed);

    // 2. Evaluate Rules (Outcomes/Knockouts)
    let finalOutcome: Outcome | null = null;
    const finalContext = { ...context, ...computed };

    // Find first matching rule
    for (const rule of quiz.outcomes) {
      if (rule.type === 'knockout' && rule.condition) {
        if (evaluateExpression(rule.condition, finalContext)) {
          finalOutcome = rule;
          break;
        }
      } else if (rule.type === 'threshold' && rule.metric) {
        const val = finalContext[rule.metric];
        const threshold = rule.threshold || 0;
        let match = false;
        
        switch (rule.operator) {
          case '>': match = val > threshold; break;
          case '>=': match = val >= threshold; break;
          case '<': match = val < threshold; break;
          case '<=': match = val <= threshold; break;
          case '==': match = val == threshold; break;
        }
        
        if (match) {
          finalOutcome = rule;
          break; // First match wins logic
        }
      }
    }

    setQuizOutcome(finalOutcome);
    
    // Save Submission
    const subId = `sub-${Date.now()}`;
    const submission: Submission = {
      id: subId,
      quizId: quiz.id,
      answers,
      calculatedValues: computed,
      score: 0, // todo: calc score if needed
      outcome: finalOutcome ? {
        label: finalOutcome.label,
        severity: finalOutcome.severity,
        message: finalOutcome.message
      } : undefined,
      name: leadName || undefined,
      email: leadEmail || undefined,
      phone: leadPhone || undefined,
      paid: !quiz.gateResults,
      status: 'completed',
      startedAt: new Date().toISOString(), // Mock
      completedAt: new Date().toISOString()
    };
    storage.addSubmission(submission);

    // Navigate
    if (finalOutcome?.type === 'knockout') {
      setStatus('knockout');
    } else if (quiz.gateResults) {
      setStatus('paywall');
    } else {
      setStatus('results');
    }
  };

  const handleBack = useCallback(() => {
    if (questionHistory.length > 0) {
      const prev = questionHistory[questionHistory.length - 1];
      setQuestionHistory(h => h.slice(0, -1));
      setCurrentQId(prev);
    }
  }, [questionHistory]);

  const handleNext = () => {
    if (!currentQ) return;

    // Track history for back navigation
    setQuestionHistory(h => [...h, currentQ.id]);

    // Check Branching
    let nextId = currentQ.defaultNextQuestionId === 'finish' ? null : (currentQ.defaultNextQuestionId || 'next');
    
    if (currentQ.branchingRules) {
      for (const rule of currentQ.branchingRules) {
        const ans = answers[currentQ.id];
        let match = false;
        // Naive comparisons
        if (rule.condition === 'equals') match = ans == rule.value;
        if (rule.condition === 'not_equals') match = ans != rule.value;
        if (rule.condition === 'greater_than') match = Number(ans) > Number(rule.value);
        if (rule.condition === 'less_than') match = Number(ans) < Number(rule.value);
        if (rule.condition === 'contains') match = String(ans).includes(rule.value);

        if (match) {
          nextId = rule.targetQuestionId === 'finish' ? null : rule.targetQuestionId;
          break;
        }
      }
    }

    if (nextId === 'next') {
      const idx = quiz.questions.findIndex(q => q.id === currentQ.id);
      if (idx < quiz.questions.length - 1) {
        setCurrentQId(quiz.questions[idx + 1].id);
      } else {
        computeResults();
      }
    } else if (nextId) {
      setCurrentQId(nextId);
    } else {
      computeResults();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (status !== 'running' || !currentQ) return;

    const handler = (e: KeyboardEvent) => {
      // Number keys 1-9 for selecting options
      if (['single', 'yes_no', 'true_false'].includes(currentQ.type) && currentQ.options) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= currentQ.options.length) {
          setAnswers(p => ({ ...p, [currentQ.id]: String(currentQ.options![num - 1].value) }));
        }
      }
      // Yes/No with 1/2
      if (['yes_no', 'true_false'].includes(currentQ.type)) {
        if (e.key === '1') setAnswers(p => ({ ...p, [currentQ.id]: true }));
        if (e.key === '2') setAnswers(p => ({ ...p, [currentQ.id]: false }));
      }
      // Enter to continue
      if (e.key === 'Enter' && answers[currentQ.id] !== undefined && answers[currentQ.id] !== '') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, currentQ, answers]);

  // --- Renderers ---

  const renderInput = () => {
    if (!currentQ) return null;
    const val = answers[currentQ.id];

    switch (currentQ.type) {
      case 'yes_no':
      case 'true_false':
        return (
          <div className="grid grid-cols-2 gap-4">
            {['Yes', 'No'].map(opt => (
              <Button 
                key={opt} 
                variant={val === (opt === 'Yes') ? 'default' : 'outline'} 
                className="h-16 text-lg"
                onClick={() => setAnswers(p => ({...p, [currentQ.id]: opt === 'Yes'}))}
              >
                {opt}
              </Button>
            ))}
          </div>
        );
      
      case 'single':
        return (
          <RadioGroup value={val} onValueChange={v => setAnswers(p => ({...p, [currentQ.id]: v}))}>
            <div className="space-y-3">
              {currentQ.options?.map((opt, idx) => (
                <div key={opt.id} className={cn(
                  "flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all",
                  val === String(opt.value)
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                )}>
                  <RadioGroupItem value={String(opt.value)} id={opt.id} />
                  <Label htmlFor={opt.id} className="flex-1 cursor-pointer font-medium">{opt.label}</Label>
                  {val === String(opt.value) && opt.points !== undefined && (
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      +{opt.points} pts
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/50 font-mono w-4">{idx + 1}</span>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'multi':
        return (
          <div className="space-y-3">
            {currentQ.options?.map(opt => {
              const selected = (val || []) as any[];
              const isSel = selected.includes(opt.value);
              return (
                <div 
                  key={opt.id} 
                  className={cn("flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-muted/50", isSel && "border-primary bg-primary/5")}
                  onClick={() => {
                    const newSel = isSel ? selected.filter(s => s !== opt.value) : [...selected, opt.value];
                    setAnswers(p => ({...p, [currentQ.id]: newSel}));
                  }}
                >
                  <Checkbox checked={isSel} />
                  <Label className="flex-1 cursor-pointer">{opt.label}</Label>
                </div>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <Select value={val} onValueChange={v => setAnswers(p => ({...p, [currentQ.id]: v}))}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Select an option"/></SelectTrigger>
            <SelectContent>
              {currentQ.options?.map(opt => (
                <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'short_text':
      case 'date':
        return <Input 
          type={currentQ.type === 'date' ? 'date' : 'text'} 
          value={val || ''} 
          onChange={e => setAnswers(p => ({...p, [currentQ.id]: e.target.value}))} 
          className="h-12 text-lg"
        />;

      case 'long_text':
        return <Textarea 
          value={val || ''} 
          onChange={e => setAnswers(p => ({...p, [currentQ.id]: e.target.value}))} 
          className="min-h-[150px] text-lg"
        />;

      case 'number':
      case 'percent':
        return (
          <div className="relative">
            <Input 
              type="number" 
              value={val || ''} 
              onChange={e => setAnswers(p => ({...p, [currentQ.id]: parseFloat(e.target.value)}))} 
              className="h-16 text-2xl text-center"
              placeholder="0"
            />
            {currentQ.type === 'percent' && <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold">%</div>}
          </div>
        );

      case 'scale_1_5':
      case 'scale_1_10':
        const max = currentQ.type === 'scale_1_5' ? 5 : 10;
        return (
          <div className="space-y-6">
            <div className="text-center text-4xl font-bold text-primary">{val || 1}</div>
            <Slider 
              min={1} max={max} step={1} 
              value={[val || 1]} 
              onValueChange={v => setAnswers(p => ({...p, [currentQ.id]: v[0]}))}
            />
            <div className="flex justify-between text-xs text-muted-foreground uppercase">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        );
    }
  };

  // --- Views ---

  if (status === 'landing') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-display font-bold">{quiz.title}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              In this quick {quiz.questions.length}-question assessment we'll evaluate your
              company's readiness and pinpoint areas for improvement. Takes about{" "}
              {Math.ceil(quiz.questions.length * 0.5)} minutes.
            </p>
          </div>

          {/* Lead capture */}
          <div className="text-left space-y-4 bg-muted/30 rounded-xl p-6 border">
            <p className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wider">
              Enter your details to get started
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Your name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="h-12"
              />
              <Input
                type="email"
                placeholder="Email address"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="h-12"
              />
              <Input
                type="tel"
                placeholder="Phone number (optional)"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <Button
            size="lg"
            className="h-16 px-12 text-xl rounded-full"
            disabled={!leadName.trim() || !leadEmail.trim()}
            onClick={() => setStatus('running')}
          >
            Ready? Let's Go <ArrowRight className="ml-2"/>
          </Button>
          <p className="text-xs text-muted-foreground">
            Your info is used only to deliver your results. We won't spam you.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'running' && currentQ) {
    const currentIdx = quiz.questions.findIndex(q => q.id === currentQ.id);
    const isLastQuestion = currentIdx === quiz.questions.length - 1;
    const canGoBack = questionHistory.length > 0;
    const hasAnswer = answers[currentQ.id] !== undefined && answers[currentQ.id] !== "";
    const showKeyboardHint = ['single', 'yes_no', 'true_false'].includes(currentQ.type);

    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted w-full">
          <motion.div 
            className="h-full bg-primary" 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Question counter */}
        <div className="flex justify-between items-center px-6 py-3 text-sm text-muted-foreground max-w-2xl mx-auto w-full">
          <span>Question {currentIdx + 1} of {quiz.questions.length}</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>

        {/* Question card */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQ.id}
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <div className="bg-card rounded-2xl border shadow-sm p-8 space-y-6">
                {currentQ.category && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase">
                    ⚡ {currentQ.category}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{currentQ.text}</h2>
                  {currentQ.helpText && <p className="text-muted-foreground">{currentQ.helpText}</p>}
                </div>
                
                <div className="py-2">
                  {renderInput()}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  {canGoBack ? (
                    <button 
                      onClick={handleBack} 
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : (
                    <div />
                  )}
                  <Button 
                    size="lg" 
                    className="px-8 rounded-xl" 
                    onClick={handleNext} 
                    disabled={currentQ.required && !hasAnswer}
                  >
                    {isLastQuestion ? "See Results" : "Continue"} <ArrowRight className="ml-2 w-4 h-4"/>
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Keyboard hint */}
        {showKeyboardHint && (
          <div className="text-center py-4 text-xs text-muted-foreground/60">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono mx-0.5">1</kbd> – <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono mx-0.5">{currentQ.options?.length || 4}</kbd> to select  •  <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono mx-0.5">Enter ↵</kbd> to continue
          </div>
        )}
      </div>
    );
  }

  if (status === 'knockout' || status === 'results') {
    const isKnockout = status === 'knockout';
    const severityColor = quizOutcome?.severity === 'fail' ? 'text-red-600 bg-red-50' : quizOutcome?.severity === 'caution' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-xl w-full shadow-2xl border-t-8 border-t-primary">
          <CardContent className="pt-12 pb-12 px-8 text-center space-y-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${severityColor}`}>
              {isKnockout ? <AlertOctagon className="w-12 h-12"/> : <CheckCircle2 className="w-12 h-12"/>}
            </div>
            
            <div>
              <h2 className="text-4xl font-bold font-display mb-2">{quizOutcome?.label || "Result"}</h2>
              <p className="text-xl text-muted-foreground">{quizOutcome?.message}</p>
            </div>

            {!isKnockout && (
              <div className="grid grid-cols-2 gap-4 text-left bg-muted/30 p-6 rounded-lg">
                {Object.entries(calculatedValues).map(([key, val]) => (
                  <div key={key}>
                    <div className="text-xs text-muted-foreground uppercase">{key}</div>
                    <div className="text-xl font-mono font-bold">{typeof val === 'number' ? val.toFixed(2) : val}</div>
                  </div>
                ))}
              </div>
            )}

            <Link href="/">
              <Button variant="outline" className="mt-8">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div>Loading...</div>;
}
