'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospital } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { useAuthStore, useLanguageStore, useNavStore, useThemeStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
    if (!username.trim() || !password.trim()) { setError(t('invalid_credentials')); return; }
    setIsLoading(true);
    try { await login(username, password); setCurrentPage('dashboard'); } catch { setError(t('invalid_credentials')); } finally { setIsLoading(false); }
  };

  return (
    <div className="flex min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Left Panel - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-20 start-20 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 end-20 size-96 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md px-8 text-center">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}>
            <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-3xl bg-white/15 shadow-2xl backdrop-blur-sm ring-1 ring-white/20">
              <FontAwesomeIcon icon={faHospital} className="size-10 text-white" />
            </div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-4xl font-bold leading-tight text-white">
            {isRTL ? 'سیستم مدیریت بیمارستان' : 'Hospital Management'}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-4 text-lg text-primary-foreground/80">
            {isRTL ? 'پلتفرم جامع مدیریت بهداشت و درمان' : 'Comprehensive Healthcare Platform'}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-10 flex justify-center gap-8 text-primary-foreground/60">
            {[{ num: '۲۰+', label: isRTL ? 'بخش' : 'Modules' }, { num: '۹۹٪', label: isRTL ? 'آپتایم' : 'Uptime' }, { num: '۲۴/۷', label: isRTL ? 'پشتیبانی' : 'Support' }].map((s, i) => (
              <div key={i} className="text-center"><p className="text-2xl font-bold text-white">{s.num}</p><p className="text-xs mt-0.5">{s.label}</p></div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Language & Theme */}
          <div className={cn('absolute top-4 flex items-center gap-2 z-50', isRTL ? 'left-4' : 'right-4')}>
            <Button variant="ghost" size="icon" onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')} className="text-muted-foreground hover:text-foreground"><Globe className="size-5" /></Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">{theme === 'light' ? <Moon className="size-5" /> : <Sun className="size-5" />}</Button>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            {/* Logo for mobile */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
                <FontAwesomeIcon icon={faHospital} className="size-5 text-white" />
              </div>
              <span className="text-lg font-bold">{isRTL ? 'بیمارستان' : 'HMS'}</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight">{t('welcome_back')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{isRTL ? 'برای ادامه وارد شوید' : 'Sign in to your account'}</p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">{t('username')}</Label>
                <Input type="text" placeholder={t('username')} value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-xl" disabled={isLoading} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">{t('password')}</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pe-12" disabled={isLoading} />
                  <Button type="button" variant="ghost" size="icon" className="absolute end-2 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>

              <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} disabled={isLoading} />
                  <Label htmlFor="remember" className="cursor-pointer text-sm text-muted-foreground">{t('remember_me')}</Label>
                </div>
                <button type="button" className="text-sm font-medium text-primary hover:underline" tabIndex={-1}>{t('forgot_password')}</button>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</motion.div>
              )}

              <Button type="submit" className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30" disabled={isLoading}>
                {isLoading ? <><Loader2 className="size-4 animate-spin" /><span className="ms-2">{t('loading')}</span></> : t('login')}
              </Button>

              <p className="text-center text-xs text-muted-foreground">{isRTL ? 'نسخه آزمایشی: admin / admin123' : 'Demo: admin / admin123'}</p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
