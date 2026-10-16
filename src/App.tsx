import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeckState, DeckTrack, CrossfaderCurve, MashupPreset, MixHistoryEvent, RandomMashupPairing, NeuralMixStems } from './types/dj';
import { POPULAR_TRACKS, getRandomCompatMashupPairing } from './data/presets';
import { createYTPlayer, createArchivePlayer, YTPlayerWrapper } from './services/youtube';
import { audioFx } from './services/audioFx';
import { Header } from './components/Header';
import { TopLyricsBar } from './components/TopLyricsBar';
import { TopMashupVideoStage } from './components/TopMashupVideoStage';
import { Deck } from './components/Deck';
import { MasterMixer } from './components/MasterMixer';
import { MixxxEffectsModal } from './components/MixxxEffectsModal';
import { MidiControllerModal } from './components/MidiControllerModal';
import { DjControllerEngine, ControllerDevice, DjActionKey } from './services/controller';
import { CrateModal } from './components/CrateModal';
import { RecordingModal } from './components/RecordingModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { FaderFxModal } from './components/FaderFxModal';
import { DynaMixModal } from './components/DynaMixModal';
import { VMachineModal } from './components/VMachineModal';
import { loadLocalFileAsTrack } from './services/localTrackLoader';
import { Shuffle, Sparkles, ArrowLeftRight, Mic, Piano } from 'lucide-react';

export default function App() {
  // Preset default tracks
  const defaultTrackA = POPULAR_TRACKS[4]; // The Weeknd - Blinding Lights (171 BPM)
  const defaultTrackB = POPULAR_TRACKS[5]; // a-ha - Take On Me (168 BPM)

  // Deck A State
  const [deckA, setDeckA] = useState<DeckState>({
    id: 'A',
    track: defaultTrackA,
    isPlaying: false,
    currentTime: 0,
    duration: defaultTrackA.duration,
    volume: 100,
    gain: 6,
    pitch: 0,
    pitchRange: 8,
    keyLock: true,
    effectiveBpm: defaultTrackA.bpm,
    tapBpmTimes: [],
    eq: { high: 0, mid: 0, low: 0 },
    eqKill: { high: false, mid: false, low: false },
    filter: 0,
    hotCues: [
      { id: 1, time: 15, label: 'Drop', color: '#06b6d4' },
      { id: 2, time: 45, label: 'Chorus', color: '#f59e0b' },
    ],
    loop: { active: false, lengthBeats: 4, startTime: null },
    pfl: false,
    isScratching: false,
    vinylAngle: 0,
    neuralMix: {
      vocals: 100,
      drums: 100,
      instruments: 100,
      vocalMute: false,
      drumMute: false,
      instrumentMute: false,
      soloStem: null,
    },
  });

  // Deck B State
  const [deckB, setDeckB] = useState<DeckState>({
    id: 'B',
    track: defaultTrackB,
    isPlaying: false,
    currentTime: 0,
    duration: defaultTrackB.duration,
    volume: 100,
    gain: 6,
    pitch: 0,
    pitchRange: 8,
    keyLock: true,
    effectiveBpm: defaultTrackB.bpm,
    tapBpmTimes: [],
    eq: { high: 0, mid: 0, low: 0 },
    eqKill: { high: false, mid: false, low: false },
    filter: 0,
    hotCues: [
      { id: 1, time: 20, label: 'Intro Synth', color: '#10b981' },
      { id: 2, time: 55, label: 'Vocals', color: '#ec4899' },
    ],
    loop: { active: false, lengthBeats: 4, startTime: null },
    pfl: false,
    isScratching: false,
    vinylAngle: 0,
    neuralMix: {
      vocals: 100,
      drums: 100,
      instruments: 100,
      vocalMute: false,
      drumMute: false,
      instrumentMute: false,
      soloStem: null,
    },
  });

  // Master Mixer State
  const [masterVolume, setMasterVolume] = useState<number>(100);
  const [crossfader, setCrossfader] = useState<number>(0); // -1 (Deck A) to +1 (Deck B)
  const [crossfaderCurve, setCrossfaderCurve] = useState<CrossfaderCurve>('smooth');
  const [isAutoTransitioning, setIsAutoTransitioning] = useState<boolean>(false);
  const [autoTransitionProgress, setAutoTransitionProgress] = useState<number>(0);

  // App Display & Navigation State
  const [displayMode, setDisplayMode] = useState<'dual' | 'blend' | 'audio-only'>('blend');
  const [isCrateModalOpen, setIsCrateModalOpen] = useState<boolean>(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isMixxxFxModalOpen, setIsMixxxFxModalOpen] = useState<boolean>(false);
  const [isFaderFxModalOpen, setIsFaderFxModalOpen] = useState<boolean>(false);
  const [isDynaMixModalOpen, setIsDynaMixModalOpen] = useState<boolean>(false);
  const [isVMachineModalOpen, setIsVMachineModalOpen] = useState<boolean>(false);
  const [localFileTargetDeck, setLocalFileTargetDeck] = useState<'A' | 'B'>('A');
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [embedErrorA, setEmbedErrorA] = useState<boolean>(false);
  const [embedErrorB, setEmbedErrorB] = useState<boolean>(false);

  // OpenMix Hardware Controller & MIDI State
  const [isMidiModalOpen, setIsMidiModalOpen] = useState<boolean>(false);
  const [controllerDevices, setControllerDevices] = useState<ControllerDevice[]>([]);
  const [learningAction, setLearningAction] = useState<DjActionKey | null>(null);
  const controllerEngineRef = useRef<DjControllerEngine | null>(null);

  // Mix Session Recorder & Active Random Mashup State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mixEvents, setMixEvents] = useState<MixHistoryEvent[]>([]);
  const [customTracks, setCustomTracks] = useState<DeckTrack[]>([]);
  const [activeRandomMashup, setActiveRandomMashup] = useState<RandomMashupPairing | null>(null);
  const [acapellaOnDeckA, setAcapellaOnDeckA] = useState<boolean>(true);
  const [searchResetTrigger, setSearchResetTrigger] = useState<number>(0);

  // Clear all browser & backend song searches and caches on load
  const clearAllSongSearchesAndCaches = useCallback(() => {
    try {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
      if (typeof window !== 'undefined' && 'caches' in window) {
        window.caches.keys().then((keys) => {
          keys.forEach((k) => window.caches.delete(k));
        }).catch(() => {});
      }
      fetch('/api/cache/clear', { method: 'POST' }).catch(() => {});
    } catch {}
    setSearchResetTrigger((prev) => prev + 1);
  }, []);

  const handleUpdateNeuralMix = useCallback((deckId: 'A' | 'B', stems: NeuralMixStems) => {
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, neuralMix: stems }));
    } else {
      setDeckB((prev) => ({ ...prev, neuralMix: stems }));
    }
  }, []);

  useEffect(() => {
    setCustomTracks([]);
    clearAllSongSearchesAndCaches();
  }, [clearAllSongSearchesAndCaches]);

  // Active Player References (points to either YT or Archive HTML5 player)
  const playerARef = useRef<YTPlayerWrapper | null>(null);
  const playerBRef = useRef<YTPlayerWrapper | null>(null);
  // Persistent YouTube IFrame References so switching back from Archive.org never loses the YT iframe
  const ytPlayerARef = useRef<YTPlayerWrapper | null>(null);
  const ytPlayerBRef = useRef<YTPlayerWrapper | null>(null);

  // Cue point backup reference for CDJ Cue behavior
  const cuePointARef = useRef<number>(15);
  const cuePointBRef = useRef<number>(20);

  // Helper to log actions when recording
  const logMixAction = useCallback((action: string, deck?: 'A' | 'B', details?: string) => {
    if (!isRecording) return;
    setMixEvents(prev => [
      ...prev,
      {
        timestamp: Date.now(),
        action,
        deck,
        details,
      },
    ]);
  }, [isRecording]);

  // Calculate and apply physical output volumes + Preamp Gain Boost to YouTube & Archive.org players
  useEffect(() => {
    if (isMuted) {
      playerARef.current?.setVolume(0);
      playerBRef.current?.setVolume(0);
      return;
    }

    // Full-Center DJ Mixer Crossfader curves:
    // At center (crossfader = 0), BOTH Deck A and Deck B output at 100% (1.0) full volume!
    // Deck A only fades out when crossfader > 0; Deck B only fades out when crossfader < 0.
    let cfWeightA = 1;
    let cfWeightB = 1;

    if (crossfaderCurve === 'smooth') {
      cfWeightA = crossfader <= 0 ? 1 : Math.cos(crossfader * (Math.PI / 2));
      cfWeightB = crossfader >= 0 ? 1 : Math.cos(Math.abs(crossfader) * (Math.PI / 2));
    } else if (crossfaderCurve === 'linear') {
      cfWeightA = crossfader <= 0 ? 1 : 1 - crossfader;
      cfWeightB = crossfader >= 0 ? 1 : 1 + crossfader;
    } else if (crossfaderCurve === 'cut') {
      cfWeightA = crossfader > 0.9 ? 0 : 1;
      cfWeightB = crossfader < -0.9 ? 0 : 1;
    }

    // 3-Band EQ & Neural Mix Stems calculation (Low/Bass: 45%, Mid/Vocal: 35%, High/Treble: 20%)
    const lowMultA = deckA.eqKill.low ? 0 : Math.max(0, 1 + deckA.eq.low / 100);
    const midMultA = deckA.eqKill.mid ? 0 : Math.max(0, 1 + deckA.eq.mid / 100);
    const highMultA = deckA.eqKill.high ? 0 : Math.max(0, 1 + deckA.eq.high / 100);
    const eqScaleA = 0.45 * lowMultA + 0.35 * midMultA + 0.20 * highMultA;

    // Neural Mix Stem multipliers (Vocals, Drums, Instruments)
    const stemsA = deckA.neuralMix || { vocals: 100, drums: 100, instruments: 100, vocalMute: false, drumMute: false, instrumentMute: false, soloStem: null };
    const vocalMultA = (stemsA.vocalMute || (stemsA.soloStem && stemsA.soloStem !== 'vocals')) ? 0 : stemsA.vocals / 100;
    const drumMultA = (stemsA.drumMute || (stemsA.soloStem && stemsA.soloStem !== 'drums')) ? 0 : stemsA.drums / 100;
    const instMultA = (stemsA.instrumentMute || (stemsA.soloStem && stemsA.soloStem !== 'instruments')) ? 0 : stemsA.instruments / 100;
    const stemScaleA = 0.40 * drumMultA + 0.35 * vocalMultA + 0.25 * instMultA;

    const filterAttenA = deckA.filter < 0
      ? Math.max(0.15, 1 + (deckA.filter / 100) * 0.75)
      : Math.max(0.15, 1 - (deckA.filter / 100) * 0.75);

    const totalEqFactorA = Math.max(0, Math.min(2.0, eqScaleA * filterAttenA * stemScaleA));

    // Deck B EQ & Neural Mix Stems
    const lowMultB = deckB.eqKill.low ? 0 : Math.max(0, 1 + deckB.eq.low / 100);
    const midMultB = deckB.eqKill.mid ? 0 : Math.max(0, 1 + deckB.eq.low / 100);
    const highMultB = deckB.eqKill.high ? 0 : Math.max(0, 1 + deckB.eq.high / 100);
    const eqScaleB = 0.45 * lowMultB + 0.35 * midMultB + 0.20 * highMultB;

    const stemsB = deckB.neuralMix || { vocals: 100, drums: 100, instruments: 100, vocalMute: false, drumMute: false, instrumentMute: false, soloStem: null };
    const vocalMultB = (stemsB.vocalMute || (stemsB.soloStem && stemsB.soloStem !== 'vocals')) ? 0 : stemsB.vocals / 100;
    const drumMultB = (stemsB.drumMute || (stemsB.soloStem && stemsB.soloStem !== 'drums')) ? 0 : stemsB.drums / 100;
    const instMultB = (stemsB.instrumentMute || (stemsB.soloStem && stemsB.soloStem !== 'instruments')) ? 0 : stemsB.instruments / 100;
    const stemScaleB = 0.40 * drumMultB + 0.35 * vocalMultB + 0.25 * instMultB;

    const filterAttenB = deckB.filter < 0
      ? Math.max(0.15, 1 + (deckB.filter / 100) * 0.75)
      : Math.max(0.15, 1 - (deckB.filter / 100) * 0.75);

    const totalEqFactorB = Math.max(0, Math.min(2.0, eqScaleB * filterAttenB * stemScaleB));

    // Preamp Gain Boost multiplier (0dB = 1.0x, +6dB = 2.0x, +12dB = 4.0x)
    const preampGainA = Math.pow(10, (deckA.gain || 0) / 20);
    const preampGainB = Math.pow(10, (deckB.gain || 0) / 20);

    const masterFactor = masterVolume / 100;
    const finalVolA = Math.round(
      Math.min(400, (deckA.volume / 100) * preampGainA * cfWeightA * totalEqFactorA * masterFactor * 100)
    );
    const finalVolB = Math.round(
      Math.min(400, (deckB.volume / 100) * preampGainB * cfWeightB * totalEqFactorB * masterFactor * 100)
    );

    if (playerARef.current) {
      playerARef.current.setVolume(finalVolA);
    }
    if (playerBRef.current) {
      playerBRef.current.setVolume(finalVolB);
    }
  }, [
    crossfader,
    crossfaderCurve,
    deckA.volume,
    deckB.volume,
    deckA.gain,
    deckB.gain,
    deckA.eq,
    deckB.eq,
    deckA.eqKill,
    deckB.eqKill,
    deckA.filter,
    deckB.filter,
    deckA.neuralMix,
    deckB.neuralMix,
    deckA.isPlaying,
    deckB.isPlaying,
    masterVolume,
    isMuted,
  ]);

  // Track videoIds that threw Error 150/101 so we can auto-switch to an embeddable audio/lyric stream
  const failedVideoIdsRef = useRef<Set<string>>(new Set());
  const deckATrackRef = useRef<DeckTrack | null>(deckA.track);
  const deckBTrackRef = useRef<DeckTrack | null>(deckB.track);
  const deckAPlayingRef = useRef<boolean>(deckA.isPlaying);
  const deckBPlayingRef = useRef<boolean>(deckB.isPlaying);

  useEffect(() => {
    deckATrackRef.current = deckA.track;
    deckAPlayingRef.current = deckA.isPlaying;
  }, [deckA.track, deckA.isPlaying]);

  useEffect(() => {
    deckBTrackRef.current = deckB.track;
    deckBPlayingRef.current = deckB.isPlaying;
  }, [deckB.track, deckB.isPlaying]);

  // Auto-heal when a YouTube video (like VEVO Error 150) blocks external domain embedding
  const recoverUnplayableYouTubeTrack = useCallback(async (deckId: 'A' | 'B') => {
    const currentTrack = deckId === 'A' ? deckATrackRef.current : deckBTrackRef.current;
    const wasPlaying = deckId === 'A' ? deckAPlayingRef.current : deckBPlayingRef.current;
    if (!currentTrack || currentTrack.source === 'archive') {
      if (deckId === 'A') setEmbedErrorA(true);
      else setEmbedErrorB(true);
      return;
    }

    failedVideoIdsRef.current.add(currentTrack.videoId);

    try {
      const searchQ = `${currentTrack.artist} ${currentTrack.title} lyrics audio`;
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQ)}&source=youtube`);
      if (res.ok) {
        const data = await res.json();
        const candidates: DeckTrack[] = Array.isArray(data.results) ? data.results : [];
        const alt = candidates.find(
          (c) => c.videoId && !failedVideoIdsRef.current.has(c.videoId)
        );
        if (alt) {
          if (deckId === 'A') {
            setEmbedErrorA(false);
            setDeckA((prev) => ({
              ...prev,
              track: prev.track ? { ...prev.track, videoId: alt.videoId } : alt,
            }));
            if (wasPlaying) {
              ytPlayerARef.current?.loadVideoById(alt.videoId, currentTrack.suggestedCue || 0);
            } else {
              ytPlayerARef.current?.cueVideoById(alt.videoId, currentTrack.suggestedCue || 0);
            }
          } else {
            setEmbedErrorB(false);
            setDeckB((prev) => ({
              ...prev,
              track: prev.track ? { ...prev.track, videoId: alt.videoId } : alt,
            }));
            if (wasPlaying) {
              ytPlayerBRef.current?.loadVideoById(alt.videoId, currentTrack.suggestedCue || 0);
            } else {
              ytPlayerBRef.current?.cueVideoById(alt.videoId, currentTrack.suggestedCue || 0);
            }
          }
          return;
        }
      }
    } catch {}

    if (deckId === 'A') setEmbedErrorA(true);
    else setEmbedErrorB(true);
  }, []);

  // Initialize YouTube Players in parallel when mounted
  useEffect(() => {
    const initPlayers = async () => {
      try {
        const initA = async () => {
          if (!ytPlayerARef.current && deckATrackRef.current && deckATrackRef.current.source !== 'archive') {
            const wrapper = await createYTPlayer('deck-a-player', deckATrackRef.current.videoId, {
              onReady: (w) => {
                ytPlayerARef.current = w;
                if (deckATrackRef.current?.source !== 'archive') {
                  playerARef.current = w;
                }
                w.setVolume(100);
              },
              onStateChange: (state) => {
                if (state === 1) {
                  setEmbedErrorA(false);
                  setDeckA(prev => ({ ...prev, isPlaying: true }));
                } else if (state === 2 || state === 0) {
                  setDeckA(prev => ({ ...prev, isPlaying: false }));
                }
              },
              onError: () => {
                recoverUnplayableYouTubeTrack('A');
              },
            });
            ytPlayerARef.current = wrapper;
            if (!playerARef.current) playerARef.current = wrapper;
          }
        };

        const initB = async () => {
          if (!ytPlayerBRef.current && deckBTrackRef.current && deckBTrackRef.current.source !== 'archive') {
            const wrapper = await createYTPlayer('deck-b-player', deckBTrackRef.current.videoId, {
              onReady: (w) => {
                ytPlayerBRef.current = w;
                if (deckBTrackRef.current?.source !== 'archive') {
                  playerBRef.current = w;
                }
                w.setVolume(100);
              },
              onStateChange: (state) => {
                if (state === 1) {
                  setEmbedErrorB(false);
                  setDeckB(prev => ({ ...prev, isPlaying: true }));
                } else if (state === 2 || state === 0) {
                  setDeckB(prev => ({ ...prev, isPlaying: false }));
                }
              },
              onError: () => {
                recoverUnplayableYouTubeTrack('B');
              },
            });
            ytPlayerBRef.current = wrapper;
            if (!playerBRef.current) playerBRef.current = wrapper;
          }
        };

        await Promise.all([initA(), initB()]);
      } catch (err) {
        console.warn('Error loading YouTube players', err);
      }
    };

    initPlayers();
  }, [recoverUnplayableYouTubeTrack]);

  // Periodic poll for time update, loop enforcement, and duration
  useEffect(() => {
    const timer = setInterval(() => {
      // Deck A Update
      if (deckA.isPlaying) {
        const ytTime = playerARef.current ? playerARef.current.getCurrentTime() : 0;
        const dur = playerARef.current ? playerARef.current.getDuration() : 0;

        setDeckA(prev => {
          const nextTime = ytTime > 0 && !embedErrorA ? ytTime : prev.currentTime + 0.25;
          const loopDuration = (60 / Math.max(20, prev.effectiveBpm)) * prev.loop.lengthBeats;
          let finalTime = nextTime;

          if (prev.loop.active && prev.loop.startTime !== null && nextTime >= prev.loop.startTime + loopDuration) {
            finalTime = prev.loop.startTime;
            playerARef.current?.seekTo(prev.loop.startTime);
          }

          return {
            ...prev,
            currentTime: finalTime,
            duration: dur > 0 ? dur : prev.duration,
          };
        });
      }

      // Deck B Update
      if (deckB.isPlaying) {
        const ytTime = playerBRef.current ? playerBRef.current.getCurrentTime() : 0;
        const dur = playerBRef.current ? playerBRef.current.getDuration() : 0;

        setDeckB(prev => {
          const nextTime = ytTime > 0 && !embedErrorB ? ytTime : prev.currentTime + 0.25;
          const loopDuration = (60 / Math.max(20, prev.effectiveBpm)) * prev.loop.lengthBeats;
          let finalTime = nextTime;

          if (prev.loop.active && prev.loop.startTime !== null && nextTime >= prev.loop.startTime + loopDuration) {
            finalTime = prev.loop.startTime;
            playerBRef.current?.seekTo(prev.loop.startTime);
          }

          return {
            ...prev,
            currentTime: finalTime,
            duration: dur > 0 ? dur : prev.duration,
          };
        });
      }
    }, 250);

    return () => clearInterval(timer);
  }, [deckA.isPlaying, deckA.loop, deckA.effectiveBpm, deckB.isPlaying, deckB.loop, deckB.effectiveBpm, embedErrorA, embedErrorB]);

  // Deck Transport Handlers: Play / Pause
  const handlePlayPause = (deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      if (deckA.isPlaying) {
        playerARef.current?.pause();
        setDeckA(prev => ({ ...prev, isPlaying: false }));
        logMixAction('Pause Deck A', 'A');
      } else {
        playerARef.current?.play();
        setDeckA(prev => ({ ...prev, isPlaying: true }));
        logMixAction('Play Deck A', 'A');
      }
    } else {
      if (deckB.isPlaying) {
        playerBRef.current?.pause();
        setDeckB(prev => ({ ...prev, isPlaying: false }));
        logMixAction('Pause Deck B', 'B');
      } else {
        playerBRef.current?.play();
        setDeckB(prev => ({ ...prev, isPlaying: true }));
        logMixAction('Play Deck B', 'B');
      }
    }
  };

  // Pioneer CDJ-style Cue: Return to cue point and pause
  const handleCue = (deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      const cueTime = cuePointARef.current;
      playerARef.current?.pause();
      playerARef.current?.seekTo(cueTime);
      setDeckA(prev => ({ ...prev, isPlaying: false, currentTime: cueTime }));
      logMixAction(`Cue Return (${cueTime.toFixed(1)}s)`, 'A');
    } else {
      const cueTime = cuePointBRef.current;
      playerBRef.current?.pause();
      playerBRef.current?.seekTo(cueTime);
      setDeckB(prev => ({ ...prev, isPlaying: false, currentTime: cueTime }));
      logMixAction(`Cue Return (${cueTime.toFixed(1)}s)`, 'B');
    }
  };

  // Waveform Seek
  const handleSeek = (deckId: 'A' | 'B', seconds: number) => {
    if (deckId === 'A') {
      playerARef.current?.seekTo(seconds);
      setDeckA(prev => ({ ...prev, currentTime: seconds }));
      cuePointARef.current = seconds;
      logMixAction(`Seek to ${seconds.toFixed(1)}s`, 'A');
    } else {
      playerBRef.current?.seekTo(seconds);
      setDeckB(prev => ({ ...prev, currentTime: seconds }));
      cuePointBRef.current = seconds;
      logMixAction(`Seek to ${seconds.toFixed(1)}s`, 'B');
    }
  };

  // Vinyl Scratch / Scrub
  const handleScratch = (deckId: 'A' | 'B', deltaSec: number) => {
    if (deckId === 'A') {
      const newTime = Math.max(0, Math.min(deckA.duration, deckA.currentTime + deltaSec));
      playerARef.current?.seekTo(newTime);
      setDeckA(prev => ({ ...prev, currentTime: newTime }));
    } else {
      const newTime = Math.max(0, Math.min(deckB.duration, deckB.currentTime + deltaSec));
      playerBRef.current?.seekTo(newTime);
      setDeckB(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  // Nudge / Bend tempo
  const handleNudge = (deckId: 'A' | 'B', dir: 1 | -1) => {
    const delta = dir * 0.4;
    handleScratch(deckId, delta);
  };

  // Pitch / Tempo Adjustment
  const handleChangePitch = (deckId: 'A' | 'B', pitch: number) => {
    if (deckId === 'A') {
      const baseBpm = deckA.track?.bpm || 120;
      const effectiveBpm = baseBpm * (1 + pitch / 100);
      setDeckA(prev => ({ ...prev, pitch, effectiveBpm }));
      // Adjust YouTube player playback rate if supported (clamped 0.5 to 2.0)
      const rate = Math.max(0.5, Math.min(2.0, 1 + pitch / 100));
      playerARef.current?.setPlaybackRate(rate);
      logMixAction(`Pitch ${pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}%`, 'A');
    } else {
      const baseBpm = deckB.track?.bpm || 120;
      const effectiveBpm = baseBpm * (1 + pitch / 100);
      setDeckB(prev => ({ ...prev, pitch, effectiveBpm }));
      const rate = Math.max(0.5, Math.min(2.0, 1 + pitch / 100));
      playerBRef.current?.setPlaybackRate(rate);
      logMixAction(`Pitch ${pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}%`, 'B');
    }
  };

  // Pro Beat & BPM Sync: Lock Tempo, expand range, and align beat downbeats
  const handleSyncBpm = (targetDeck: 'A' | 'B') => {
    if (targetDeck === 'A') {
      const targetBpm = deckB.effectiveBpm;
      const baseA = deckA.track?.bpm || 120;
      const neededPitch = ((targetBpm / baseA) - 1) * 100;

      // Auto-expand pitch range if needed so sync is never clamped
      const newRange: 8 | 16 | 50 = Math.abs(neededPitch) > 16 ? 50 : Math.abs(neededPitch) > 8 ? 16 : deckA.pitchRange;

      setDeckA(prev => ({
        ...prev,
        pitch: neededPitch,
        effectiveBpm: targetBpm,
        pitchRange: newRange,
      }));

      // Apply playback rate on player (clamped 0.5 to 2.0)
      const rate = Math.max(0.5, Math.min(2.0, targetBpm / baseA));
      playerARef.current?.setPlaybackRate(rate);

      // Beat Phase Sync: lock downbeats together if Deck B is playing
      if (deckB.isPlaying && targetBpm > 0) {
        const beatSec = 60 / targetBpm;
        const phaseB = deckB.currentTime % beatSec;
        const currentA = deckA.currentTime;
        const wholeBeatsA = Math.floor(currentA / beatSec);
        const alignedTime = Math.max(0, wholeBeatsA * beatSec + phaseB);
        playerARef.current?.seekTo(alignedTime);
        setDeckA(prev => ({ ...prev, currentTime: alignedTime }));
      }

      logMixAction(`Beat & BPM Sync to ${targetBpm.toFixed(1)} BPM`, 'A');
    } else {
      const targetBpm = deckA.effectiveBpm;
      const baseB = deckB.track?.bpm || 120;
      const neededPitch = ((targetBpm / baseB) - 1) * 100;

      const newRange: 8 | 16 | 50 = Math.abs(neededPitch) > 16 ? 50 : Math.abs(neededPitch) > 8 ? 16 : deckB.pitchRange;

      setDeckB(prev => ({
        ...prev,
        pitch: neededPitch,
        effectiveBpm: targetBpm,
        pitchRange: newRange,
      }));

      const rate = Math.max(0.5, Math.min(2.0, targetBpm / baseB));
      playerBRef.current?.setPlaybackRate(rate);

      if (deckA.isPlaying && targetBpm > 0) {
        const beatSec = 60 / targetBpm;
        const phaseA = deckA.currentTime % beatSec;
        const currentB = deckB.currentTime;
        const wholeBeatsB = Math.floor(currentB / beatSec);
        const alignedTime = Math.max(0, wholeBeatsB * beatSec + phaseA);
        playerBRef.current?.seekTo(alignedTime);
        setDeckB(prev => ({ ...prev, currentTime: alignedTime }));
      }

      logMixAction(`Beat & BPM Sync to ${targetBpm.toFixed(1)} BPM`, 'B');
    }
  };

  // Tap BPM Detector
  const handleTapBpm = (deckId: 'A' | 'B') => {
    const now = Date.now();
    const target = deckId === 'A' ? deckA : deckB;
    const history = [...target.tapBpmTimes, now].filter(t => now - t < 3000).slice(-6);

    if (history.length >= 2) {
      const intervals = [];
      for (let i = 1; i < history.length; i++) {
        intervals.push(history[i] - history[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);

      if (calculatedBpm >= 50 && calculatedBpm <= 220) {
        if (deckId === 'A') {
          setDeckA(prev => ({
            ...prev,
            effectiveBpm: calculatedBpm,
            tapBpmTimes: history,
            track: prev.track ? { ...prev.track, bpm: calculatedBpm } : null,
          }));
        } else {
          setDeckB(prev => ({
            ...prev,
            effectiveBpm: calculatedBpm,
            tapBpmTimes: history,
            track: prev.track ? { ...prev.track, bpm: calculatedBpm } : null,
          }));
        }
        return;
      }
    }

    if (deckId === 'A') {
      setDeckA(prev => ({ ...prev, tapBpmTimes: history }));
    } else {
      setDeckB(prev => ({ ...prev, tapBpmTimes: history }));
    }
  };

  // Hot Cues: Set or Jump
  const handleTriggerCue = (deckId: 'A' | 'B', id: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const existing = deck.hotCues.find(c => c.id === id);

    if (existing) {
      // Jump to existing cue
      handleSeek(deckId, existing.time);
      logMixAction(`Jump Hot Cue ${id} (${existing.time.toFixed(1)}s)`, deckId);
    } else {
      // Set new cue at current time
      const colors = ['#06b6d4', '#f59e0b', '#10b981', '#ec4899'];
      const newCue = {
        id,
        time: deck.currentTime,
        label: `Cue ${id}`,
        color: colors[id - 1] || '#06b6d4',
      };
      if (deckId === 'A') {
        setDeckA(prev => ({ ...prev, hotCues: [...prev.hotCues, newCue] }));
      } else {
        setDeckB(prev => ({ ...prev, hotCues: [...prev.hotCues, newCue] }));
      }
      logMixAction(`Set Hot Cue ${id} at ${deck.currentTime.toFixed(1)}s`, deckId);
    }
  };

  const handleDeleteCue = (deckId: 'A' | 'B', id: number) => {
    if (deckId === 'A') {
      setDeckA(prev => ({ ...prev, hotCues: prev.hotCues.filter(c => c.id !== id) }));
    } else {
      setDeckB(prev => ({ ...prev, hotCues: prev.hotCues.filter(c => c.id !== id) }));
    }
  };

  // Beat Loop Handlers
  const handleSetLoop = (deckId: 'A' | 'B', beats: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (deckId === 'A') {
      setDeckA(prev => ({
        ...prev,
        loop: {
          active: true,
          lengthBeats: beats,
          startTime: prev.loop.active && prev.loop.startTime !== null ? prev.loop.startTime : prev.currentTime,
        },
      }));
    } else {
      setDeckB(prev => ({
        ...prev,
        loop: {
          active: true,
          lengthBeats: beats,
          startTime: prev.loop.active && prev.loop.startTime !== null ? prev.loop.startTime : prev.currentTime,
        },
      }));
    }
    logMixAction(`Set Loop ${beats} Beats`, deckId);
  };

  const handleToggleLoop = (deckId: 'A' | 'B') => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (deckId === 'A') {
      setDeckA(prev => ({
        ...prev,
        loop: {
          ...prev.loop,
          active: !prev.loop.active,
          startTime: !prev.loop.active ? prev.currentTime : prev.loop.startTime,
        },
      }));
    } else {
      setDeckB(prev => ({
        ...prev,
        loop: {
          ...prev.loop,
          active: !prev.loop.active,
          startTime: !prev.loop.active ? prev.currentTime : prev.loop.startTime,
        },
      }));
    }
  };

  // Automated Smooth Crossfader Transition
  const handleStartAutoTransition = (durationSec: number) => {
    if (isAutoTransitioning) return;
    setIsAutoTransitioning(true);

    const startCf = crossfader;
    // If on Deck A side, fade to Deck B (+1); otherwise fade to Deck A (-1)
    const targetCf = startCf <= 0 ? 1 : -1;
    const startTime = performance.now();
    const durationMs = durationSec * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      setAutoTransitionProgress(progress);

      // Smooth cosine easing
      const eased = (1 - Math.cos(progress * Math.PI)) / 2;
      const currentVal = startCf + (targetCf - startCf) * eased;
      setCrossfader(currentVal);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCrossfader(targetCf);
        setIsAutoTransitioning(false);
        setAutoTransitionProgress(0);
        logMixAction(`Auto Transition Complete to Deck ${targetCf > 0 ? 'B' : 'A'}`);
      }
    };

    requestAnimationFrame(tick);
  };

  // Load Mashup Preset (Loads both Deck A and Deck B with preset matching, stays paused)
  const handleLoadMashupPreset = (preset: MashupPreset) => {
    clearAllSongSearchesAndCaches();
    setEmbedErrorA(false);
    setEmbedErrorB(false);
    setActiveRandomMashup(null);

    const archElA = document.getElementById('deck-a-archive-video') as HTMLVideoElement | null;
    if (archElA) archElA.pause();
    const archElB = document.getElementById('deck-b-archive-video') as HTMLVideoElement | null;
    if (archElB) archElB.pause();

    // Deck A
    setDeckA(prev => ({
      ...prev,
      track: preset.deckA,
      effectiveBpm: preset.recommendedBpm,
      currentTime: preset.deckA.suggestedCue || 0,
      isPlaying: false,
    }));
    cuePointARef.current = preset.deckA.suggestedCue || 0;
    if (ytPlayerARef.current) {
      playerARef.current = ytPlayerARef.current;
      ytPlayerARef.current.cueVideoById(preset.deckA.videoId, preset.deckA.suggestedCue || 0);
      ytPlayerARef.current.pause();
    }

    // Deck B
    setDeckB(prev => ({
      ...prev,
      track: preset.deckB,
      effectiveBpm: preset.recommendedBpm,
      currentTime: preset.deckB.suggestedCue || 0,
      isPlaying: false,
    }));
    cuePointBRef.current = preset.deckB.suggestedCue || 0;
    if (ytPlayerBRef.current) {
      playerBRef.current = ytPlayerBRef.current;
      ytPlayerBRef.current.cueVideoById(preset.deckB.videoId, preset.deckB.suggestedCue || 0);
      ytPlayerBRef.current.pause();
    }

    logMixAction(`Loaded Mashup Preset: "${preset.title}"`);
  };

  // Intelligent Random Mashup Generator (Top Acapella + Top Instrumental where Songs, Lyrics & Beats go together)
  const handleRandomMashup = (overridePairing?: RandomMashupPairing, forceAcapellaOnA?: boolean) => {
    clearAllSongSearchesAndCaches();
    const pairing = overridePairing || getRandomCompatMashupPairing(activeRandomMashup?.id);
    const putAcapellaOnA = forceAcapellaOnA !== undefined ? forceAcapellaOnA : acapellaOnDeckA;

    setActiveRandomMashup(pairing);
    setAcapellaOnDeckA(putAcapellaOnA);
    setEmbedErrorA(false);
    setEmbedErrorB(false);
    setCrossfader(0); // Center crossfader 50/50 so both Acapella and Instrumental play together at full volume

    const archElA = document.getElementById('deck-a-archive-video') as HTMLVideoElement | null;
    if (archElA) archElA.pause();
    const archElB = document.getElementById('deck-b-archive-video') as HTMLVideoElement | null;
    if (archElB) archElB.pause();

    const trackForA = putAcapellaOnA ? pairing.acapella : pairing.instrumental;
    const trackForB = putAcapellaOnA ? pairing.instrumental : pairing.acapella;

    // Calculate exact pitch % needed to lock both stems to pairing.targetBpm
    const pitchA = ((pairing.targetBpm / trackForA.bpm) - 1) * 100;
    const pitchB = ((pairing.targetBpm / trackForB.bpm) - 1) * 100;
    const rangeA: 8 | 16 | 50 = Math.abs(pitchA) > 16 ? 50 : Math.abs(pitchA) > 8 ? 16 : 8;
    const rangeB: 8 | 16 | 50 = Math.abs(pitchB) > 16 ? 50 : Math.abs(pitchB) > 8 ? 16 : 8;

    // Carve Vocal-Pocket EQ on Acapella (-35 Low cut, +15 Mid vocal presence, +10 High air)
    // and Beat-Pocket EQ on Instrumental (+15 Low punch, -10 Mid vocal pocket, +5 High crispness)
    const acapellaEq = { low: -35, mid: 15, high: 10 };
    const instrumentalEq = { low: 15, mid: -10, high: 5 };

    const cueA = trackForA.suggestedCue || 0;
    const cueB = trackForB.suggestedCue || 0;
    cuePointARef.current = cueA;
    cuePointBRef.current = cueB;

    setDeckA(prev => ({
      ...prev,
      track: trackForA,
      duration: trackForA.duration,
      pitch: pitchA,
      pitchRange: rangeA,
      effectiveBpm: pairing.targetBpm,
      currentTime: cueA,
      volume: 100,
      eq: putAcapellaOnA ? acapellaEq : instrumentalEq,
      eqKill: { high: false, mid: false, low: false },
      filter: 0,
      isPlaying: true,
    }));

    setDeckB(prev => ({
      ...prev,
      track: trackForB,
      duration: trackForB.duration,
      pitch: pitchB,
      pitchRange: rangeB,
      effectiveBpm: pairing.targetBpm,
      currentTime: cueB,
      volume: 100,
      eq: putAcapellaOnA ? instrumentalEq : acapellaEq,
      eqKill: { high: false, mid: false, low: false },
      filter: 0,
      isPlaying: true,
    }));

    const rateA = Math.max(0.5, Math.min(2.0, pairing.targetBpm / trackForA.bpm));
    const rateB = Math.max(0.5, Math.min(2.0, pairing.targetBpm / trackForB.bpm));

    if (ytPlayerARef.current) {
      playerARef.current = ytPlayerARef.current;
      ytPlayerARef.current.loadVideoById(trackForA.videoId, cueA);
      ytPlayerARef.current.setVolume(100);
      ytPlayerARef.current.setPlaybackRate(rateA);
      ytPlayerARef.current.play();
    }

    if (ytPlayerBRef.current) {
      playerBRef.current = ytPlayerBRef.current;
      ytPlayerBRef.current.loadVideoById(trackForB.videoId, cueB);
      ytPlayerBRef.current.setVolume(100);
      ytPlayerBRef.current.setPlaybackRate(rateB);
      ytPlayerBRef.current.play();
    }

    logMixAction(`Auto-Loaded Random Stem Mashup: "${pairing.title}" (${pairing.targetBpm} BPM)`);
  };

  // Load individual track to specific deck (supports both YouTube and Archive.org media!)
  const handleLoadTrackToDeck = (deckId: 'A' | 'B', track: DeckTrack) => {
    clearAllSongSearchesAndCaches();
    setCustomTracks(prev => (prev.some(t => t.id === track.id) ? prev : [track, ...prev]));

    if (deckId === 'A') {
      playerARef.current?.pause();
      setEmbedErrorA(false);
      setDeckA(prev => ({
        ...prev,
        track,
        duration: track.duration || prev.duration,
        effectiveBpm: track.bpm,
        pitch: 0,
        currentTime: track.suggestedCue || 0,
        isPlaying: false,
      }));
      cuePointARef.current = track.suggestedCue || 0;

      if (track.source === 'archive' && track.mediaUrl) {
        ytPlayerARef.current?.pause();
        const archPlayer = createArchivePlayer(
          'deck-a-archive-video',
          track.mediaUrl,
          track.suggestedCue || 0,
          {
            onStateChange: (state) => {
              if (state === 1) {
                setEmbedErrorA(false);
                setDeckA(prev => ({ ...prev, isPlaying: true }));
              } else if (state === 2 || state === 0) {
                setDeckA(prev => ({ ...prev, isPlaying: false }));
              }
            },
            onError: () => setEmbedErrorA(true),
          }
        );
        if (archPlayer) {
          playerARef.current = archPlayer;
          archPlayer.setVolume(deckA.volume);
        }
      } else {
        // Stop any archive video on Deck A
        const archEl = document.getElementById('deck-a-archive-video') as HTMLVideoElement | null;
        if (archEl) archEl.pause();

        if (ytPlayerARef.current) {
          playerARef.current = ytPlayerARef.current;
          ytPlayerARef.current.cueVideoById(track.videoId, track.suggestedCue || 0);
        } else {
          createYTPlayer('deck-a-player', track.videoId, {
            onReady: (wrapper) => {
              ytPlayerARef.current = wrapper;
              playerARef.current = wrapper;
              wrapper.setVolume(100);
            },
            onStateChange: (state) => {
              if (state === 1) {
                setEmbedErrorA(false);
                setDeckA(prev => ({ ...prev, isPlaying: true }));
              } else if (state === 2 || state === 0 || state === 5) {
                setDeckA(prev => ({ ...prev, isPlaying: false }));
              }
            },
            onError: () => recoverUnplayableYouTubeTrack('A'),
          });
        }
      }
      logMixAction(`Loaded Track (${track.source === 'archive' ? 'Archive.org' : 'YouTube'}): ${track.title}`, 'A');
    } else {
      playerBRef.current?.pause();
      setEmbedErrorB(false);
      setDeckB(prev => ({
        ...prev,
        track,
        duration: track.duration || prev.duration,
        effectiveBpm: track.bpm,
        pitch: 0,
        currentTime: track.suggestedCue || 0,
        isPlaying: false,
      }));
      cuePointBRef.current = track.suggestedCue || 0;

      if (track.source === 'archive' && track.mediaUrl) {
        ytPlayerBRef.current?.pause();
        const archPlayer = createArchivePlayer(
          'deck-b-archive-video',
          track.mediaUrl,
          track.suggestedCue || 0,
          {
            onStateChange: (state) => {
              if (state === 1) {
                setEmbedErrorB(false);
                setDeckB(prev => ({ ...prev, isPlaying: true }));
              } else if (state === 2 || state === 0) {
                setDeckB(prev => ({ ...prev, isPlaying: false }));
              }
            },
            onError: () => setEmbedErrorB(true),
          }
        );
        if (archPlayer) {
          playerBRef.current = archPlayer;
          archPlayer.setVolume(deckB.volume);
        }
      } else {
        const archEl = document.getElementById('deck-b-archive-video') as HTMLVideoElement | null;
        if (archEl) archEl.pause();

        if (ytPlayerBRef.current) {
          playerBRef.current = ytPlayerBRef.current;
          ytPlayerBRef.current.cueVideoById(track.videoId, track.suggestedCue || 0);
        } else {
          createYTPlayer('deck-b-player', track.videoId, {
            onReady: (wrapper) => {
              ytPlayerBRef.current = wrapper;
              playerBRef.current = wrapper;
              wrapper.setVolume(100);
            },
            onStateChange: (state) => {
              if (state === 1) {
                setEmbedErrorB(false);
                setDeckB(prev => ({ ...prev, isPlaying: true }));
              } else if (state === 2 || state === 0 || state === 5) {
                setDeckB(prev => ({ ...prev, isPlaying: false }));
              }
            },
            onError: () => recoverUnplayableYouTubeTrack('B'),
          });
        }
      }
      logMixAction(`Loaded Track (${track.source === 'archive' ? 'Archive.org' : 'YouTube'}): ${track.title}`, 'B');
    }
  };

  const handleHeaderLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { track, dynamix } = await loadLocalFileAsTrack(file);
        (track as any).dynamix = dynamix;
        handleLoadTrackToDeck(localFileTargetDeck, track);
        setLocalFileTargetDeck((prev) => (prev === 'A' ? 'B' : 'A'));
      } catch (err) {
        console.error('Failed to load local file from header:', err);
      }
    }
    if (e.target) e.target.value = '';
  };

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Deck A Transport
      if (key === 'w') {
        e.preventDefault();
        handlePlayPause('A');
      } else if (key === 'q') {
        e.preventDefault();
        handleCue('A');
      } else if (key === 'e') {
        e.preventDefault();
        handleSyncBpm('A');
      } else if (['1', '2', '3', '4'].includes(key)) {
        e.preventDefault();
        handleTriggerCue('A', parseInt(key, 10));
      }

      // Deck B Transport
      else if (key === 'i') {
        e.preventDefault();
        handlePlayPause('B');
      } else if (key === 'u') {
        e.preventDefault();
        handleCue('B');
      } else if (key === 'o') {
        e.preventDefault();
        handleSyncBpm('B');
      } else if (['7', '8', '9', '0'].includes(key)) {
        e.preventDefault();
        const num = key === '0' ? 4 : parseInt(key, 10) - 6;
        handleTriggerCue('B', num);
      }

      // Mixer Crossfader
      else if (key === '[') {
        e.preventDefault();
        setCrossfader(prev => Math.max(-1, prev - 0.1));
      } else if (key === ']') {
        e.preventDefault();
        setCrossfader(prev => Math.min(1, prev + 0.1));
      } else if (key === ' ') {
        e.preventDefault();
        setCrossfader(0);
      }

      // Sampler Sound FX Pads
      else if (key === 'h') {
        audioFx.playAirhorn();
      } else if (key === 'b') {
        audioFx.play808Drop();
      } else if (key === 'n') {
        audioFx.playSiren();
      } else if (key === 't') {
        audioFx.playVinylBrake();
      } else if (key === 'l') {
        audioFx.playLaser();
      } else if (key === 'r') {
        audioFx.playBackspin();
      } else if (key === 's') {
        audioFx.playRaveStab();
      } else if (key === 'm') {
        audioFx.playBeatClick(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // OpenMix Hardware Controller & Web MIDI Engine
  useEffect(() => {
    const engine = new DjControllerEngine({
      onAction: (action, value) => {
        switch (action) {
          case 'crossfader':
            if (value !== undefined) setCrossfader(Math.max(-1, Math.min(1, value)));
            break;
          case 'masterVolume':
            if (value !== undefined) setMasterVolume(Math.max(0, Math.min(100, value)));
            break;
          case 'deckA_play':
            handlePlayPause('A');
            break;
          case 'deckA_cue':
            handleCue('A');
            break;
          case 'deckA_sync':
            handleSyncBpm('A');
            break;
          case 'deckA_volume':
            if (value !== undefined) setDeckA(prev => ({ ...prev, volume: value }));
            break;
          case 'deckA_filter':
            if (value !== undefined) setDeckA(prev => ({ ...prev, filter: value }));
            break;
          case 'deckA_hotcue1':
            handleTriggerCue('A', 1);
            break;
          case 'deckA_hotcue2':
            handleTriggerCue('A', 2);
            break;
          case 'deckA_hotcue3':
            handleTriggerCue('A', 3);
            break;
          case 'deckA_hotcue4':
            handleTriggerCue('A', 4);
            break;
          case 'deckB_play':
            handlePlayPause('B');
            break;
          case 'deckB_cue':
            handleCue('B');
            break;
          case 'deckB_sync':
            handleSyncBpm('B');
            break;
          case 'deckB_volume':
            if (value !== undefined) setDeckB(prev => ({ ...prev, volume: value }));
            break;
          case 'deckB_filter':
            if (value !== undefined) setDeckB(prev => ({ ...prev, filter: value }));
            break;
          case 'deckB_hotcue1':
            handleTriggerCue('B', 1);
            break;
          case 'deckB_hotcue2':
            handleTriggerCue('B', 2);
            break;
          case 'deckB_hotcue3':
            handleTriggerCue('B', 3);
            break;
          case 'deckB_hotcue4':
            handleTriggerCue('B', 4);
            break;
          case 'fxOn':
            audioFx.toggleFx();
            break;
          case 'fxLevel':
            if (value !== undefined) audioFx.setFxLevel(value);
            break;
          case 'airhorn':
            audioFx.playAirhorn();
            break;
        }
      },
      onDeviceChange: (devs) => {
        setControllerDevices(devs);
      },
      onMidiLearnCaptured: () => {
        setLearningAction(null);
      },
    });

    controllerEngineRef.current = engine;
    engine.init();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-950 via-slate-950 to-neutral-950 animate-bg-aurora text-neutral-100 flex flex-col font-sans select-none antialiased relative overflow-x-hidden">
      {/* Animated Full-Screen Ambient DJ Grid Background */}
      <div className="fixed -inset-12 z-0 pointer-events-none animate-bg-grid opacity-30" />

      {/* Top Header */}
      <div className="relative z-10 w-full">
        <Header
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
          keyA={deckA.track?.key}
          keyB={deckB.track?.key}
          isRecording={isRecording}
          onOpenCrateModal={() => setIsCrateModalOpen(true)}
          onOpenRecordingModal={() => setIsRecordingModalOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          onOpenMidiModal={() => setIsMidiModalOpen(true)}
          connectedControllersCount={controllerDevices.length}
          onOpenMixxxFx={() => setIsMixxxFxModalOpen(true)}
          onOpenFaderFx={() => setIsFaderFxModalOpen(true)}
          onOpenDynaMix={() => setIsDynaMixModalOpen(true)}
          onOpenVMachine={() => setIsVMachineModalOpen(true)}
          onOpenLocalFile={() => {
            setLocalFileTargetDeck('A');
            headerFileInputRef.current?.click();
          }}
          isMuted={isMuted}
          onToggleMute={() => {
            setIsMuted(!isMuted);
            audioFx.setMute(!isMuted);
          }}
          onRandomMashup={() => handleRandomMashup()}
        />
      </div>

      {/* Main Console Layout */}
      <main className="relative z-10 flex-1 max-w-[1720px] w-full min-w-0 mx-auto px-2 sm:px-3 py-1.5 flex flex-col gap-2">
        {/* Top Lyrics Bar: Real-Time Vocal Teleprompter HUD (Always visible on top) */}
        <TopLyricsBar
          trackA={deckA.track}
          trackB={deckB.track}
          currentTimeA={deckA.currentTime}
          currentTimeB={deckB.currentTime}
          isPlayingA={deckA.isPlaying}
          isPlayingB={deckB.isPlaying}
          crossfader={crossfader}
          bpmA={deckA.effectiveBpm}
          bpmB={deckB.effectiveBpm}
        />

        {/* Top Mashup Video Stage: Dual YouTube videos mashed up at the top with Screen blend and CC for Accapella */}
        <TopMashupVideoStage
          trackA={deckA.track}
          trackB={deckB.track}
          currentTimeA={deckA.currentTime}
          currentTimeB={deckB.currentTime}
          isPlayingA={deckA.isPlaying}
          isPlayingB={deckB.isPlaying}
          bpmA={deckA.effectiveBpm}
          bpmB={deckB.effectiveBpm}
          crossfader={crossfader}
          onCrossfaderChange={setCrossfader}
          loopAActive={deckA.loop.active}
          loopBActive={deckB.loop.active}
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
          embedErrorA={embedErrorA}
          embedErrorB={embedErrorB}
          onPlayPauseA={() => handlePlayPause('A')}
          onPlayPauseB={() => handlePlayPause('B')}
        />

        {/* Dual Decks & Central Master Mixer */}
        <div className="flex flex-col lg:flex-row gap-2 items-stretch">
          {/* DECK A */}
          <Deck
            state={deckA}
            oppositeDeckTrack={deckB.track}
            oppositeEffectiveBpm={deckB.effectiveBpm}
            onPlayPause={() => handlePlayPause('A')}
            onCue={() => handleCue('A')}
            onSeek={(secs) => handleSeek('A', secs)}
            onScratch={(delta) => handleScratch('A', delta)}
            onNudge={(dir) => handleNudge('A', dir)}
            onChangePitch={(p) => handleChangePitch('A', p)}
            onSetPitchRange={(rng) => setDeckA(prev => ({ ...prev, pitchRange: rng }))}
            onToggleKeyLock={() => setDeckA(prev => ({ ...prev, keyLock: !prev.keyLock }))}
            onSyncBpm={() => handleSyncBpm('A')}
            onTapBpm={() => handleTapBpm('A')}
            onChangeEQ={(band, val) => setDeckA(prev => ({ ...prev, eq: { ...prev.eq, [band]: val } }))}
            onToggleKill={(band) => setDeckA(prev => ({ ...prev, eqKill: { ...prev.eqKill, [band]: !prev.eqKill[band] } }))}
            onChangeFilter={(val) => setDeckA(prev => ({ ...prev, filter: val }))}
            onChangeGain={(g) => setDeckA(prev => ({ ...prev, gain: g }))}
            onChangeVolume={(v) => setDeckA(prev => ({ ...prev, volume: v }))}
            onTriggerCue={(id) => handleTriggerCue('A', id)}
            onDeleteCue={(id) => handleDeleteCue('A', id)}
            onSetLoop={(beats) => handleSetLoop('A', beats)}
            onToggleLoop={() => handleToggleLoop('A')}
            onHalveLoop={() => handleSetLoop('A', Math.max(0.25, deckA.loop.lengthBeats / 2))}
            onDoubleLoop={() => handleSetLoop('A', Math.min(32, deckA.loop.lengthBeats * 2))}
            onOpenCrateModal={() => setIsCrateModalOpen(true)}
            onLoadTrack={(t) => handleLoadTrackToDeck('A', t)}
            customTracks={customTracks}
            showVideo={false}
            resetSearchTrigger={searchResetTrigger}
            onChangeNeuralMix={(stems) => handleUpdateNeuralMix('A', stems)}
            onOpenDynaMix={() => setIsDynaMixModalOpen(true)}
            onOpenFaderFx={() => setIsFaderFxModalOpen(true)}
          />

          {/* MASTER MIXER CONSOLE */}
          <div className="flex justify-center">
            <MasterMixer
              volumeA={deckA.volume}
              volumeB={deckB.volume}
              gainA={deckA.gain}
              gainB={deckB.gain}
              masterVolume={masterVolume}
              crossfader={crossfader}
              crossfaderCurve={crossfaderCurve}
              pflA={deckA.pfl}
              pflB={deckB.pfl}
              isDeckAPlaying={deckA.isPlaying}
              isDeckBPlaying={deckB.isPlaying}
              onChangeVolumeA={(vol) => setDeckA(prev => ({ ...prev, volume: vol }))}
              onChangeVolumeB={(vol) => setDeckB(prev => ({ ...prev, volume: vol }))}
              onChangeGainA={(g) => setDeckA(prev => ({ ...prev, gain: g }))}
              onChangeGainB={(g) => setDeckB(prev => ({ ...prev, gain: g }))}
              onChangeMasterVolume={setMasterVolume}
              onChangeCrossfader={setCrossfader}
              onChangeCurve={setCrossfaderCurve}
              onTogglePflA={() => setDeckA(prev => ({ ...prev, pfl: !prev.pfl }))}
              onTogglePflB={() => setDeckB(prev => ({ ...prev, pfl: !prev.pfl }))}
              onStartAutoTransition={handleStartAutoTransition}
              isAutoTransitioning={isAutoTransitioning}
              autoTransitionProgress={autoTransitionProgress}
              onRandomMashup={() => handleRandomMashup()}
              onSwapRandomMashupDecks={() =>
                activeRandomMashup && handleRandomMashup(activeRandomMashup, !acapellaOnDeckA)
              }
              activeRandomMashup={activeRandomMashup}
              onOpenMixxxFx={() => setIsMixxxFxModalOpen(true)}
            />
          </div>

          {/* DECK B */}
          <Deck
            state={deckB}
            oppositeDeckTrack={deckA.track}
            oppositeEffectiveBpm={deckA.effectiveBpm}
            onPlayPause={() => handlePlayPause('B')}
            onCue={() => handleCue('B')}
            onSeek={(secs) => handleSeek('B', secs)}
            onScratch={(delta) => handleScratch('B', delta)}
            onNudge={(dir) => handleNudge('B', dir)}
            onChangePitch={(p) => handleChangePitch('B', p)}
            onSetPitchRange={(rng) => setDeckB(prev => ({ ...prev, pitchRange: rng }))}
            onToggleKeyLock={() => setDeckB(prev => ({ ...prev, keyLock: !prev.keyLock }))}
            onSyncBpm={() => handleSyncBpm('B')}
            onTapBpm={() => handleTapBpm('B')}
            onChangeEQ={(band, val) => setDeckB(prev => ({ ...prev, eq: { ...prev.eq, [band]: val } }))}
            onToggleKill={(band) => setDeckB(prev => ({ ...prev, eqKill: { ...prev.eqKill, [band]: !prev.eqKill[band] } }))}
            onChangeFilter={(val) => setDeckB(prev => ({ ...prev, filter: val }))}
            onChangeGain={(g) => setDeckB(prev => ({ ...prev, gain: g }))}
            onChangeVolume={(v) => setDeckB(prev => ({ ...prev, volume: v }))}
            onTriggerCue={(id) => handleTriggerCue('B', id)}
            onDeleteCue={(id) => handleDeleteCue('B', id)}
            onSetLoop={(beats) => handleSetLoop('B', beats)}
            onToggleLoop={() => handleToggleLoop('B')}
            onHalveLoop={() => handleSetLoop('B', Math.max(0.25, deckB.loop.lengthBeats / 2))}
            onDoubleLoop={() => handleSetLoop('B', Math.min(32, deckB.loop.lengthBeats * 2))}
            onOpenCrateModal={() => setIsCrateModalOpen(true)}
            onLoadTrack={(t) => handleLoadTrackToDeck('B', t)}
            customTracks={customTracks}
            showVideo={false}
            resetSearchTrigger={searchResetTrigger}
            onChangeNeuralMix={(stems) => handleUpdateNeuralMix('B', stems)}
            onOpenDynaMix={() => setIsDynaMixModalOpen(true)}
            onOpenFaderFx={() => setIsFaderFxModalOpen(true)}
          />
        </div>
      </main>

      {/* Modals */}
      <MixxxEffectsModal
        isOpen={isMixxxFxModalOpen}
        onClose={() => setIsMixxxFxModalOpen(false)}
        bpmA={deckA.effectiveBpm}
        bpmB={deckB.effectiveBpm}
      />

      <MidiControllerModal
        isOpen={isMidiModalOpen}
        onClose={() => setIsMidiModalOpen(false)}
        devices={controllerDevices}
        onStartLearn={(action) => {
          setLearningAction(action);
          controllerEngineRef.current?.startLearn(action);
        }}
        learningAction={learningAction}
        onResetMappings={() => controllerEngineRef.current?.resetCustomMappings()}
      />

      <CrateModal
        isOpen={isCrateModalOpen}
        onClose={() => setIsCrateModalOpen(false)}
        onLoadTrackToDeck={handleLoadTrackToDeck}
        onLoadMashupPreset={handleLoadMashupPreset}
        onAddCustomTrack={(t) => setCustomTracks(prev => [t, ...prev])}
        customTracks={customTracks}
        resetTrigger={searchResetTrigger}
      />

      <RecordingModal
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        isRecording={isRecording}
        events={mixEvents}
        deckA={deckA}
        deckB={deckB}
        onToggleRecording={() => setIsRecording(!isRecording)}
        onClearHistory={() => setMixEvents([])}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Hidden Global Local File Input */}
      <input
        type="file"
        ref={headerFileInputRef}
        onChange={handleHeaderLocalFile}
        accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.ogg,.aac,.mp4,.webm"
        className="hidden"
      />

      {/* Fader FX Theory & 3-Slot MacroFX Chains Modal */}
      <FaderFxModal
        isOpen={isFaderFxModalOpen}
        onClose={() => setIsFaderFxModalOpen(false)}
        bpmA={deckA.effectiveBpm}
        bpmB={deckB.effectiveBpm}
      />

      {/* DynaMix Audio Transition & Energy Engine Modal */}
      <DynaMixModal
        isOpen={isDynaMixModalOpen}
        onClose={() => setIsDynaMixModalOpen(false)}
        deckATrack={deckA.track}
        deckBTrack={deckB.track}
        onApplyCuesA={(cues) => {
          setDeckA((prev) => ({
            ...prev,
            cuePoints: [
              { id: 1, time: cues.intro, label: 'Intro (DynaMix)' },
              { id: 2, time: cues.drop, label: 'Drop (DynaMix)' },
              { id: 3, time: cues.breakdown, label: 'Break (DynaMix)' },
              { id: 4, time: cues.outro, label: 'Outro (DynaMix)' },
            ],
          }));
        }}
        onApplyCuesB={(cues) => {
          setDeckB((prev) => ({
            ...prev,
            cuePoints: [
              { id: 1, time: cues.intro, label: 'Intro (DynaMix)' },
              { id: 2, time: cues.drop, label: 'Drop (DynaMix)' },
              { id: 3, time: cues.breakdown, label: 'Break (DynaMix)' },
              { id: 4, time: cues.outro, label: 'Outro (DynaMix)' },
            ],
          }));
        }}
        onOpenLocalFileA={() => {
          setLocalFileTargetDeck('A');
          headerFileInputRef.current?.click();
        }}
        onOpenLocalFileB={() => {
          setLocalFileTargetDeck('B');
          headerFileInputRef.current?.click();
        }}
      />

      {/* V-Machine Visual Synthesizer & Audio Host Modal */}
      <VMachineModal
        isOpen={isVMachineModalOpen}
        onClose={() => setIsVMachineModalOpen(false)}
        isPlayingA={deckA.isPlaying}
        isPlayingB={deckB.isPlaying}
        bpmA={deckA.effectiveBpm}
        bpmB={deckB.effectiveBpm}
        crossfader={crossfader}
      />
    </div>
  );
}
