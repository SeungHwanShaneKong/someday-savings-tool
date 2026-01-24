import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('올바른 이메일 형식을 입력해주세요');
const passwordSchema = z.string().min(6, '비밀번호는 6자 이상이어야 해요');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/budget" replace />;
  }

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: '로그인 실패',
              description: '이메일 또는 비밀번호가 올바르지 않아요',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '오류가 발생했어요',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          navigate('/budget');
        }
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: '이미 가입된 이메일이에요',
              description: '로그인을 시도해보세요',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '오류가 발생했어요',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: '가입을 환영해요! 🎉',
            description: '이제 예산 계획을 시작해볼까요?',
          });
          navigate('/budget');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google 로그인 실패',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 pb-8 max-w-lg mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-display text-foreground mb-2">
            {mode === 'login' ? '다시 만나서 반가워요' : '함께 시작해요'}
          </h1>
          <p className="text-body-lg text-muted-foreground">
            {mode === 'login' 
              ? '예산 계획을 이어서 진행해볼까요?' 
              : '결혼 예산 계획의 첫 걸음'}
          </p>
        </div>

        {/* Google Login Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full h-14 text-body-lg font-medium rounded-xl border-2 mb-6 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isGoogleLoading ? '연결 중...' : 'Google로 계속하기'}
        </Button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-small text-muted-foreground">또는</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="이름 (선택)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-14 pl-12 text-body-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className="h-14 pl-12 text-body-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
            {errors.email && (
              <p className="text-small text-destructive pl-4">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                className="h-14 pl-12 text-body-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
            {errors.password && (
              <p className="text-small text-destructive pl-4">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-body-lg font-semibold rounded-xl mt-6"
          >
            {isSubmitting 
              ? '잠시만요...' 
              : mode === 'login' 
                ? '로그인' 
                : '가입하기'}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setErrors({});
            }}
            className="text-body text-muted-foreground hover:text-primary transition-colors"
          >
            {mode === 'login' 
              ? '아직 계정이 없으신가요? 가입하기' 
              : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </main>
    </div>
  );
}
