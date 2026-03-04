import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { User, Mail, Calendar, Lock, Loader, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AccountTab() {
  const { t } = useTranslation('app');
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;
      toast.success(t('settings.account.profileSaved'));
    } catch {
      toast.error(t('settings.account.profileError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.account.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('settings.account.passwordTooShort'));
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('settings.account.passwordChanged'));
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('settings.account.passwordError'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-brand-50 p-2.5">
            <User className="h-4 w-4 text-brand-600" />
          </div>
          <h2 className="text-sm font-semibold text-ink">{t('settings.account.title')}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-300 block mb-1.5">
              {t('settings.account.fullName')}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('settings.account.fullNamePlaceholder')}
              className="w-full max-w-md rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-300 block mb-1.5">
              {t('settings.account.email')}
            </label>
            <div className="flex items-center gap-2 max-w-md rounded-xl bg-surface-muted px-4 py-2.5 border border-ink-50/50">
              <Mail className="h-4 w-4 text-ink-300 shrink-0" />
              <span className="text-sm text-ink">{user?.email || '--'}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-300 block mb-1.5">
              {t('settings.account.memberSince')}
            </label>
            <div className="flex items-center gap-2 max-w-md rounded-xl bg-surface-muted px-4 py-2.5 border border-ink-50/50">
              <Calendar className="h-4 w-4 text-ink-300 shrink-0" />
              <span className="text-sm text-ink">{formatDate(user?.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="btn-primary text-sm py-2 px-5 flex items-center gap-2"
          >
            {savingProfile ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t('settings.account.saveProfile')}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <h2 className="text-sm font-semibold text-ink">{t('settings.account.changePassword')}</h2>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-medium text-ink-300 block mb-1.5">
              {t('settings.account.newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-300 block mb-1.5">
              {t('settings.account.confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition-all"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="btn-primary text-sm py-2 px-5 flex items-center gap-2 disabled:opacity-50"
          >
            {savingPassword ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {t('settings.account.updatePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
