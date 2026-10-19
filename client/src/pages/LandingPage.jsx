import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ArrowRight,
  Film,
  Zap,
  Layers,
  Wand2,
  Mic,
  Subtitles,
  Share2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Square,
  Shield,
} from 'lucide-react';
import VideoPlayer from '../components/common/VideoPlayer';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [previewAspect, setPreviewAspect] = useState('16:9');
  const [previewStyle, setPreviewStyle] = useState('cinematic');

  const faqs = [
    {
      q: 'How does AI Video Creator generate videos?',
      a: 'The platform translates your text prompts or scripts into scenes using neural generation pipelines and renders real high-definition MP4 videos with dynamic visuals, synchronized voiceovers, and background music via our FFmpeg video rendering engine.',
    },
    {
      q: 'What video aspect ratios are supported?',
      a: 'We support 16:9 Landscape (ideal for YouTube & Desktop), 9:16 Vertical (optimized for Instagram Reels, YouTube Shorts, and TikTok), and 1:1 Square (perfect for Facebook and Instagram feeds).',
    },
    {
      q: 'Do I need paid API keys to use the platform?',
      a: 'No! The platform includes a high-fidelity built-in Demo Provider that synthesizes real videos, audio, and subtitles right out of the box using local FFmpeg processing. You can also connect Replicate, Runway, or OpenAI keys anytime in settings.',
    },
    {
      q: 'Can I edit the generated videos and subtitles?',
      a: 'Yes. Our built-in video editor allows you to trim start and end timestamps, convert aspect ratios, edit subtitle cues, modify background audio volume, and pick poster frame thumbnails.',
    },
    {
      q: 'How do social exports and publishing work?',
      a: 'We provide specialized export presets for YouTube, Instagram, and Facebook that automatically validate resolution, dimensions, and bitrate, plus provide tailored captions and hashtags ready for 1-click publishing.',
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 md:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Glow backdrop circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-6 animate-pulse-slow">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Next-Gen AI Video Generation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Turn Ideas into <span className="gradient-text">Stunning Videos</span> in Seconds
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Create, edit, and export AI-assisted videos from simple prompts or full scripts.
          Auto-synchronized voiceovers, dynamic captions, and 1-click social presets for YouTube, Instagram, and Facebook.
        </p>

        {/* CTA Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-purple to-brand-pink hover:from-brand-500 hover:to-brand-violet text-white font-semibold text-base shadow-xl shadow-brand-600/25 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-5 h-5" />
            Start Creating Free
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-dark-card hover:bg-slate-800 text-slate-200 font-semibold text-base border border-dark-border transition-colors"
          >
            <Play className="w-4 h-4 fill-slate-300" />
            Watch Interactive Demo
          </a>
        </div>

        {/* Live Interactive Preview Card */}
        <div id="demo" className="mt-16 max-w-5xl mx-auto">
          <div className="p-3 sm:p-5 rounded-2xl glass-panel border border-slate-700/60 shadow-2xl">
            {/* Aspect and style bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Format:</span>
                <button
                  onClick={() => setPreviewAspect('16:9')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    previewAspect === '16:9'
                      ? 'bg-brand-600 text-white'
                      : 'bg-dark-surface text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> 16:9 Landscape
                </button>
                <button
                  onClick={() => setPreviewAspect('9:16')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    previewAspect === '9:16'
                      ? 'bg-brand-600 text-white'
                      : 'bg-dark-surface text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> 9:16 Shorts/Reels
                </button>
                <button
                  onClick={() => setPreviewAspect('1:1')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    previewAspect === '1:1'
                      ? 'bg-brand-600 text-white'
                      : 'bg-dark-surface text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" /> 1:1 Feed
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Style:</span>
                {['cinematic', 'anime', 'cyberpunk'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPreviewStyle(st)}
                    className={`capitalize px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      previewStyle === st
                        ? 'bg-brand-purple text-white'
                        : 'bg-dark-surface text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Player Display */}
            <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
              <VideoPlayer
                src=""
                poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
                aspectRatio={previewAspect}
                className="w-full max-w-4xl"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-2">
              <span>Sample: "Cinematic commercial for next-generation AI shopping assistant"</span>
              <span className="text-brand-400 font-medium">1080p Full HD &bull; 60 FPS &bull; AAC Audio</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-2">Capabilities</h2>
          <p className="text-3xl sm:text-4xl font-heading font-bold text-white">
            Everything You Need to Produce High-Converting Videos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Wand2,
              title: 'Text & Script-to-Video',
              desc: 'Convert single-line prompts or multi-paragraph scripts into complete videos with matching visuals and scene pacing.',
            },
            {
              icon: Mic,
              title: 'AI Voiceovers',
              desc: 'Choose from a variety of natural studio voices in English and other languages with synchronized narration.',
            },
            {
              icon: Subtitles,
              title: 'Automated Captions',
              desc: 'Generate readable subtitle overlays automatically. Edit cue timings, font size, colors, and export .SRT files.',
            },
            {
              icon: Layers,
              title: 'Timeline Video Editor',
              desc: 'Trim start and end points, adjust aspect ratios, balance background music volume, and select poster thumbnails.',
            },
            {
              icon: Share2,
              title: 'Social Export Presets',
              desc: 'Optimized export profiles for YouTube (16:9 & Shorts), Instagram (Reels & Feed), and Facebook with suggested hashtags.',
            },
            {
              icon: Zap,
              title: 'FFmpeg Processing Pipeline',
              desc: 'Real, high-performance server-side rendering and encoding ensuring your MP4 files play smoothly on every device.',
            },
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl glass-card border border-dark-border space-y-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-purple mb-2">Seamless Workflow</h2>
          <p className="text-3xl sm:text-4xl font-heading font-bold text-white">Three Steps to Your Next Viral Video</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Write or Paste Your Idea',
              desc: 'Enter a creative prompt or paste an entire script. Choose your visual style, aspect ratio, voiceover voice, and background music.',
            },
            {
              step: '02',
              title: 'AI Generation & Rendering',
              desc: 'Our engine generates visual scenes, harmonizes the soundtrack, formats timed subtitles, and renders a real MP4 video.',
            },
            {
              step: '03',
              title: 'Edit & Export for Socials',
              desc: 'Trim scenes, adjust audio mixing, select poster frames, and download platform-ready files for YouTube, Instagram, and Facebook.',
            },
          ].map((item, idx) => (
            <div key={idx} className="relative p-8 rounded-2xl bg-dark-card border border-dark-border space-y-4">
              <span className="text-4xl font-extrabold font-heading text-brand-500/30">{item.step}</span>
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-pink mb-2">Transparent Pricing</h2>
          <p className="text-3xl sm:text-4xl font-heading font-bold text-white">Start Free, Upgrade as You Grow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 rounded-2xl bg-dark-card border border-dark-border flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Starter</h3>
              <p className="text-xs text-slate-400 mt-1">For creators testing out AI video generation</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> 100 Free Credits</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> 720p HD Exports</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Standard Voiceovers</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Full Video Editor Access</li>
              </ul>
            </div>
            <Link to="/register" className="w-full text-center py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors">
              Get Started
            </Link>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="p-8 rounded-2xl relative bg-gradient-to-b from-brand-900/40 via-dark-card to-dark-card border-2 border-brand-500 shadow-2xl shadow-brand-500/20 flex flex-col justify-between space-y-6">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-purple text-white text-xs font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Pro Creator</h3>
              <p className="text-xs text-slate-400 mt-1">For active social media creators & marketers</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$29</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> 1,000 Monthly Credits</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> 1080p Full HD Rendering</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Priority Generation Queue</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Multi-Platform Social Exporter</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Auto-Burn Captions & .SRT Export</li>
              </ul>
            </div>
            <Link to="/register" className="w-full text-center py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/25 transition-all">
              Upgrade to Pro
            </Link>
          </div>

          {/* Agency Tier */}
          <div className="p-8 rounded-2xl bg-dark-card border border-dark-border flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Agency</h3>
              <p className="text-xs text-slate-400 mt-1">For creative studios & high-volume teams</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$99</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Unlimited Video Projects</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> 4K Ultra HD Export Quality</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Custom API & Replicate/Runway Keys</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-brand-400" /> Dedicated Cloud Rendering</li>
              </ul>
            </div>
            <Link to="/register" className="w-full text-center py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-cyan mb-2">Got Questions?</h2>
          <p className="text-3xl font-heading font-bold text-white">Frequently Asked Questions</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-xl bg-dark-card border border-dark-border overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-slate-200 hover:text-white transition-colors"
              >
                <span>{faq.q}</span>
                {activeFaq === idx ? <ChevronUp className="w-5 h-5 text-brand-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-10 sm:p-14 overflow-hidden bg-gradient-to-r from-brand-900/60 via-dark-card to-purple-950/60 border border-brand-500/30 text-center shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
              Ready to Create Your First AI Video?
            </h2>
            <p className="text-slate-300 text-base sm:text-lg">
              Join thousands of creators who produce professional videos in minutes instead of days.
            </p>
            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base shadow-xl shadow-brand-600/30 transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                Get Started in Seconds
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
