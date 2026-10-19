import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Unlink,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function SocialAccountsPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Connect modal
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/social/accounts');
      if (res.data.success) {
        setAccounts(res.data.accounts);
      }
    } catch (err) {
      toast.error('Failed to load connected social accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenConnect = (platform) => {
    setSelectedPlatform(platform);
    setAccountName('');
    setConnectModalOpen(true);
  };

  const handleConfirmConnect = async (e) => {
    e.preventDefault();
    if (!selectedPlatform) return;
    setConnecting(true);

    try {
      const res = await api.post(`/social/${selectedPlatform}/connect`, {
        accountName: accountName.trim() || `${selectedPlatform.toUpperCase()} Creator Channel`,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setConnectModalOpen(false);
        fetchAccounts();
      }
    } catch (err) {
      toast.error('Failed to connect account.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (platform) => {
    try {
      const res = await api.post(`/social/${platform}/disconnect`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchAccounts();
      }
    } catch (err) {
      toast.error('Failed to disconnect account.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading social integrations..." className="h-96" />;
  }

  const platformMeta = {
    youtube: {
      title: 'YouTube Studio',
      description: 'Publish videos directly to your YouTube channel or upload YouTube Shorts.',
      badge: 'Official OAuth',
      color: 'text-red-500',
    },
    instagram: {
      title: 'Instagram Professional',
      description: 'Publish 9:16 Reels and 1:1 square video posts to your Instagram creator account.',
      badge: 'Meta Graph API',
      color: 'text-pink-500',
    },
    facebook: {
      title: 'Facebook Pages',
      description: 'Share video announcements, promotional clips, and stories to your Facebook business page.',
      badge: 'Facebook Graph API',
      color: 'text-blue-500',
    },
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white flex items-center gap-2.5">
          <Share2 className="w-6 h-6 text-brand-400" />
          Connected Social Accounts
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Connect your social creator channels to enable 1-click publishing preparation and scheduling.
        </p>
      </div>

      {/* Security alert */}
      <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-start gap-3">
        <Shield className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Encrypted Token Storage</p>
          <p>
            All social credentials and OAuth tokens are AES-256-CBC encrypted at rest in our MySQL database. We only request publication permissions and never store passwords.
          </p>
        </div>
      </div>

      {/* Social Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const meta = platformMeta[acc.platform] || {};
          return (
            <div
              key={acc.platform}
              className="p-6 rounded-3xl bg-dark-card border border-dark-border flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={`text-base font-bold text-white ${meta.color}`}>{meta.title}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-surface border border-slate-700 text-slate-400">
                    {meta.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{meta.description}</p>

                {acc.connected ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-bold truncate">{acc.accountName}</p>
                      <p className="text-[10px] text-emerald-400/80">Active & Connected</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
                    Not connected
                  </div>
                )}
              </div>

              <div>
                {acc.connected ? (
                  <button
                    onClick={() => handleDisconnect(acc.platform)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect Account
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenConnect(acc.platform)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Connect {acc.platform.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={`Connect ${selectedPlatform ? selectedPlatform.toUpperCase() : ''} Account`}
      >
        <form onSubmit={handleConfirmConnect} className="space-y-4">
          <p className="text-xs text-slate-300">
            Link your social creator profile to prepare seamless video releases:
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Channel / Profile Name</label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. My Creative Studio Channel"
              className="w-full px-3 py-2.5 rounded-xl bg-dark-surface border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-dark-surface border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Requested Permissions:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Upload and manage video creations</li>
              <li>Read channel metadata for export validation</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConnectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/25"
            >
              {connecting ? 'Authorizing...' : 'Authorize & Connect'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
