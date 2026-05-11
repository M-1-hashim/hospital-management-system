'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useLanguageStore, useNavStore, useThemeStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Sun, Moon } from 'lucide-react';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const { t, isRTL, locale, setLocale } = useLanguageStore();
  const { theme, toggleTheme } = useThemeStore();
  const { setCurrentPage } = useNavStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('invalid_credentials'));
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      setCurrentPage('dashboard');
    } catch {
      setError(t('invalid_credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
      {/* Background Decorative Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -start-40 size-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -end-40 size-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 start-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Language & Theme Controls */}
      <div
        className={cn(
          'absolute top-4 flex items-center gap-2',
          isRTL ? 'left-4' : 'right-4'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
          className="text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={t('language')}
        >
          <Globe className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={t('theme')}
        >
          {theme === 'light' ? (
            <Moon className="size-5" />
          ) : (
            <Sun className="size-5" />
          )}
        </Button>
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Card className="border-0 bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-gray-900/95">
          <CardHeader className="flex flex-col items-center gap-4 pb-2 text-center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25"
            >
              <Plus className="size-8 text-white" strokeWidth={3} />
            </motion.div>

            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('dashboard').split(' ').slice(0, 1)[0]}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('welcome_back')}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  {t('username')}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pe-10"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 size-11 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div
                className={cn(
                  'flex items-center justify-between',
                  isRTL && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-2',
                    isRTL && 'flex-row-reverse'
                  )}
                >
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="remember"
                    className="cursor-pointer text-sm text-muted-foreground"
                  >
                    {t('remember_me')}
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  tabIndex={-1}
                >
                  {t('forgot_password')}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                className="mt-1 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t('loading')}</span>
                  </>
                ) : (
                  <span className="font-semibold">{t('login')}</span>
                )}
              </Button>

              {/* Demo Credentials Hint */}
              <p className="text-center text-xs text-muted-foreground">
                {isRTL
                  ? 'نسخه آزمایشی: admin / admin'
                  : 'Demo: admin / admin'}
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
