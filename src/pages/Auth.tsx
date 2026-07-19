import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const usernameSchema = z.string().min(3, 'Username must be at least 3 characters');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Convert username to internal email format for Supabase auth
const toInternalEmail = (username: string) => `${username.toLowerCase()}@canoplast.local`;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  const { user, signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateForm = () => {
    const errors: { username?: string; password?: string } = {};
    
    try {
      usernameSchema.parse(username);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.username = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.password = e.errors[0].message;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkUserActive = async (userId: string): Promise<boolean> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error checking user status:', error);
        return true; // Default to active if we can't check
      }

      return profile?.is_active !== false;
    } catch (err) {
      console.error('Error checking user status:', err);
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const internalEmail = toInternalEmail(username);

    try {
      if (isLogin) {
        const { error, data } = await signIn(internalEmail, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid username or password. Please try again.');
          } else {
            setError(error.message);
          }
        } else if (data?.user) {
          // Check if user is active
          const isActive = await checkUserActive(data.user.id);
          if (!isActive) {
            // Sign out the disabled user
            await signOut();
            setError('Your account has been disabled. Please contact an administrator.');
            return;
          }
        }
      } else {
        const { error, data } = await signUp(internalEmail, password, fullName || username);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('An account with this username already exists. Please sign in instead.');
          } else {
            setError(error.message);
          }
        } else if (data.user) {
          // Auto-confirm is enabled, so user should be logged in
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size={64} className="inline-block mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Canoplast ERP</h1>
          <p className="text-muted-foreground mt-1">
            Canoplast Manufacturing ERP System
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin
                ? 'Sign in to access your dashboard'
                : 'Get started with Canoplast ERP'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, username: undefined }));
                }}
                className={`h-12 ${validationErrors.username ? 'border-destructive' : ''}`}
                autoComplete="username"
              />
              {validationErrors.username && (
                <p className="text-xs text-destructive">{validationErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`h-12 pr-12 ${validationErrors.password ? 'border-destructive' : ''}`}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-xs text-destructive">{validationErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setValidationErrors({});
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 Canoplast ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
