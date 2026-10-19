import React, { useState } from 'react';
import {
  CheckCircle2,
  Zap,
  Sparkles,
  Shield,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';

export default function PricingPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: 'Starter Free',
      price: '$0',
      period: 'forever',
      credits: 100,
      description: 'Ideal for testing out AI video creation and basic social posting.',
      features: [
        '100 Free Generation Credits',
        '720p HD Video Exports',
        'Text-to-Video & Script-to-Video',
        'Standard Narration Voices',
        'Timeline Video Trimming & Editor',
      ],
      current: user?.plan_tier === 'free',
      buttonText: 'Current Plan',
      buttonClass: 'bg-slate-800 text-slate-400 cursor-default',
    },
    {
      id: 'pro',
      name: 'Pro Creator',
      price: '$29',
      period: 'per month',
      credits: 1000,
      featured: true,
      description: 'For active YouTube creators, digital marketers, and agencies.',
      features: [
        '1,000 Monthly Generation Credits',
        '1080p Full HD & 60 FPS Export',
        'Priority Neural Generation Queue',
        'Multi-Platform Presets (YouTube, Reels, Facebook)',
        'Automated Subtitle Transcription & .SRT Export',
        'Custom Background Music Mixing',
      ],
      current: user?.plan_tier === 'pro',
      buttonText: user?.plan_tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      buttonClass: 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30',
    },
    {
      id: 'agency',
      name: 'Agency Studio',
      price: '$99',
      period: 'per month',
      credits: 5000,
      description: 'High-volume studio pipelines with dedicated rendering power.',
      features: [
        '5,000 Monthly Generation Credits',
        '4K Ultra HD Export Resolution',
        'Commercial Licensing on all Video & Audio',
        'Custom Commercial API Keys (Runway, Replicate, Sora)',
        'Unlimited Project Storage',
        'Dedicated 24/7 Priority Support',
      ],
      current: user?.plan_tier === 'agency',
      buttonText: user?.plan_tier === 'agency' ? 'Current Plan' : 'Upgrade to Agency',
      buttonClass: 'bg-gradient-to-r from-purple-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 text-white shadow-lg shadow-purple-600/30',
    },
  ];

  const handleSelectPlan = (plan) => {
    if (plan.current) return;
    setSelectedPlan(plan);
    setCheckoutModalOpen(true);
  };

  const handleConfirmUpgrade = () => {
    setUpgrading(true);
    setTimeout(() => {
      updateUser({
        plan_tier: selectedPlan.id,
        credits: (user?.credits || 0) + selectedPlan.credits,
      });
      setUpgrading(false);
      setCheckoutModalOpen(false);
      toast.success(`Upgraded to ${selectedPlan.name}! ${selectedPlan.credits} credits added.`);
    }, 1200);
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/30">
          <Zap className="w-3.5 h-3.5 fill-brand-400" />
          <span>Flexible Plans & Credits</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white">
          Level Up Your Video Production
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Choose a plan that fits your creative scale. No hidden fees. Cancel anytime.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-8 rounded-3xl flex flex-col justify-between space-y-8 relative transition-all ${
              p.featured
                ? 'bg-gradient-to-b from-brand-900/40 via-dark-card to-dark-card border-2 border-brand-500 shadow-2xl shadow-brand-500/20 md:-translate-y-2'
                : 'bg-dark-card border border-dark-border'
            }`}
          >
            {p.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-purple text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                Most Popular
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                {p.current && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Active
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 min-h-[32px]">{p.description}</p>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-heading font-extrabold text-white">{p.price}</span>
                <span className="text-xs text-slate-400">/{p.period}</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 pt-4 border-t border-slate-800">
                {p.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan(p)}
              disabled={p.current}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all ${p.buttonClass}`}
            >
              {p.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* Credit Top-up Explainer */}
      <div className="p-8 rounded-3xl bg-dark-card border border-dark-border flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            How Credits Work
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Every standard video generation uses 10 credits. Editing operations (trimming, aspect ratio conversion, and captions) are unlimited and free! Credits never expire on active accounts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-400">Your Current Balance</p>
            <p className="text-2xl font-heading font-extrabold text-white">{user?.credits ?? 100} Credits</p>
          </div>
        </div>
      </div>

      {/* Checkout Preview Modal */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={`Upgrade to ${selectedPlan?.name}`}
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-dark-surface border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">{selectedPlan?.name}</p>
              <p className="text-xs text-slate-400">Includes {selectedPlan?.credits} generation credits</p>
            </div>
            <p className="text-xl font-heading font-extrabold text-brand-400">{selectedPlan?.price}</p>
          </div>

          <p className="text-xs text-slate-300">
            For demonstration and project evaluation, clicking <strong>Confirm Upgrade</strong> will immediately activate the plan and credit your balance.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmUpgrade}
              disabled={upgrading}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              {upgrading ? 'Activating Plan...' : 'Confirm Upgrade'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
