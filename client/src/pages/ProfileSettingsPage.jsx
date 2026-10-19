import React, { useState } from 'react';
import {
  User,
  Lock,
  Cpu,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Zap,
  HardDrive,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import Modal from '../components/common/Modal';

export default function ProfileSettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  // Profile details state
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // AI Provider settings (stored in localStorage for current client session)
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'demo');
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
  const [savingProvider, setSavingProvider] = useState(false);

  // Delete account modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/auth/profile', { name });
      if (res.data.success) {
        updateUser({ name });
        toast.success('Profile details updated!');
      }
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await api.post('/auth/change-password', { currentPassword, newPassword });
      if (res.data.success) {
        toast.success('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveProviderConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('ai_provider', aiProvider);
    if (aiApiKey) {
      localStorage.setItem('ai_api_key', aiApiKey);
    } else {
      localStorage.removeItem('ai_api_key');
    }
    toast.success('AI Provider configuration saved!');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await api.delete('/auth/account');
      if (res.data.success) {
        toast.info('Account deleted.');
        logout();
      }
    } catch (err) {
      toast.error('Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-brand-400" />
          Account & Studio Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your personal credentials, AI generation provider keys, and account preferences.
        </p>
      </div>

      {/* Profile Details Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-dark-card border border-dark-border space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-brand-400" />
          Personal Information
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface/40 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Update Details'}
            </button>
          </div>
        </form>
      </div>

      {/* AI Provider Configuration */}
      <div className="p-6 sm:p-8 rounded-3xl bg-dark-card border border-dark-border space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-purple" />
            AI Video Generation Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose between our high-fidelity built-in FFmpeg renderer or external commercial video models.
          </p>
        </div>

        <form onSubmit={handleSaveProviderConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="demo">High-Fidelity Demo Engine (FFmpeg, Audio Synthesis & Subtitles - 100% Free)</option>
              <option value="replicate">Replicate (Stable Video Diffusion / AnimateDiff)</option>
              <option value="runway">Runway (Gen-2 / Gen-3 Alpha)</option>
              <option value="openai">OpenAI (Sora Video Model)</option>
            </select>
          </div>

          {aiProvider !== 'demo' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {aiProvider.toUpperCase()} API Key / Token
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={`Enter your ${aiProvider} API token...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your key is stored securely in your client session and never exposed in public repositories.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-violet text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
            >
              Save Engine Settings
            </button>
          </div>
        </form>
      </div>

      {/* Password Change */}
      <div className="p-6 sm:p-8 rounded-3xl bg-dark-card border border-dark-border space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-400" />
          Security & Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-surface border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {savingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Deletion Danger Zone */}
      <div className="p-6 sm:p-8 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Permanently delete your account, projects, video exports, and stored media files.
            </p>
          </div>

          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/40 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Permanent Account Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to permanently delete your account?
          </p>
          <p className="text-xs text-rose-400">
            This action cannot be undone. All your video projects, generated assets, subtitles, and connected accounts will be deleted immediately from MySQL.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              {deleting ? 'Deleting Account...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
