/**
 * Web MIDI & Gamepad DJ Hardware Controller Engine
 * Integrated from OpenMix (https://github.com/blackmagic42/openmix)
 */

export interface ControllerDevice {
  id: string;
  type: 'midi' | 'gamepad';
  name: string;
  connected: boolean;
}

export type DjActionKey =
  | 'crossfader'
  | 'deckA_play'
  | 'deckA_cue'
  | 'deckA_sync'
  | 'deckA_volume'
  | 'deckA_pitch'
  | 'deckA_filter'
  | 'deckA_eqHigh'
  | 'deckA_eqMid'
  | 'deckA_eqLow'
  | 'deckA_hotcue1'
  | 'deckA_hotcue2'
  | 'deckA_hotcue3'
  | 'deckA_hotcue4'
  | 'deckB_play'
  | 'deckB_cue'
  | 'deckB_sync'
  | 'deckB_volume'
  | 'deckB_pitch'
  | 'deckB_filter'
  | 'deckB_eqHigh'
  | 'deckB_eqMid'
  | 'deckB_eqLow'
  | 'deckB_hotcue1'
  | 'deckB_hotcue2'
  | 'deckB_hotcue3'
  | 'deckB_hotcue4'
  | 'masterVolume'
  | 'fxOn'
  | 'fxLevel'
  | 'airhorn';

export interface DjControllerCallbacks {
  onAction: (action: DjActionKey, value?: number) => void;
  onDeviceChange?: (devices: ControllerDevice[]) => void;
  onMidiLearnCaptured?: (action: DjActionKey, midiKey: string) => void;
}

const STORAGE_KEY = 'yt_dj_midi_custom_map';

export class DjControllerEngine {
  private midiAccess: any = null;
  private callbacks: DjControllerCallbacks;
  private customMidiMap: Record<string, DjActionKey> = {};
  private learningAction: DjActionKey | null = null;
  private connectedDevices: Map<string, ControllerDevice> = new Map();
  private gamepadLoopId: number | null = null;
  private prevGamepadButtons: boolean[] = [];

  constructor(callbacks: DjControllerCallbacks) {
    this.callbacks = callbacks;
    this.loadCustomMap();
  }

  private loadCustomMap() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.customMidiMap = JSON.parse(stored);
      }
    } catch {}
  }

  private saveCustomMap() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customMidiMap));
    } catch {}
  }

  public async init(): Promise<boolean> {
    let midiSuccess = false;

    // 1. Initialize Web MIDI
    if (typeof navigator !== 'undefined' && (navigator as any).requestMIDIAccess) {
      try {
        this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
        this.setupMidiInputs();
        this.midiAccess.onstatechange = () => {
          this.setupMidiInputs();
        };
        midiSuccess = true;
      } catch (e) {
        console.warn('[DjControllerEngine] Web MIDI access denied or unavailable', e);
      }
    }

    // 2. Initialize Gamepad polling
    this.startGamepadPolling();

    return midiSuccess;
  }

  private setupMidiInputs() {
    if (!this.midiAccess) return;

    this.connectedDevices.clear();

    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      this.connectedDevices.set(input.id, {
        id: input.id,
        type: 'midi',
        name: input.name || 'USB MIDI DJ Controller',
        connected: input.state === 'connected',
      });

      input.onmidimessage = (e: any) => this.handleMidiMessage(e.data, input.name || '');
    }

    this.notifyDevices();
  }

  private handleMidiMessage(data: Uint8Array, deviceName: string) {
    if (!data || data.length < 2) return;

    const status = data[0];
    const d1 = data[1];
    const d2 = data.length > 2 ? data[2] : 0;
    const msgType = status & 0xf0;
    const channel = status & 0x0f;

    const midiKey = `${status}:${d1}`;

    // MIDI Learn Mode
    if (this.learningAction) {
      this.customMidiMap[midiKey] = this.learningAction;
      this.saveCustomMap();
      if (this.callbacks.onMidiLearnCaptured) {
        this.callbacks.onMidiLearnCaptured(this.learningAction, `${deviceName} (0x${status.toString(16)} ${d1})`);
      }
      this.learningAction = null;
      return;
    }

    // Check user-mapped actions first
    if (this.customMidiMap[midiKey]) {
      const act = this.customMidiMap[midiKey];
      if (msgType === 0xb0) {
        // Control Change (0 - 127)
        this.callbacks.onAction(act, d2 / 127);
      } else if (msgType === 0x90 && d2 > 0) {
        // Note On
        this.callbacks.onAction(act);
      }
      return;
    }

    // Default built-in Pioneer DDJ-400 / FLX4 / FLX6 & Standard MIDI map
    // Crossfader: CC 8, 31, 64 (0 to 127 -> -1 to +1)
    if (msgType === 0xb0 && (d1 === 8 || d1 === 31 || d1 === 64)) {
      const crossVal = (d2 / 127) * 2 - 1; // -1 to +1
      this.callbacks.onAction('crossfader', crossVal);
      return;
    }

    // Deck A Volume Fader (CC 19 or CC 7 ch 0)
    if (msgType === 0xb0 && (d1 === 19 || (d1 === 7 && channel === 0))) {
      this.callbacks.onAction('deckA_volume', (d2 / 127) * 100);
      return;
    }

    // Deck B Volume Fader (CC 20 or CC 7 ch 1)
    if (msgType === 0xb0 && (d1 === 20 || (d1 === 7 && channel === 1))) {
      this.callbacks.onAction('deckB_volume', (d2 / 127) * 100);
      return;
    }

    // Master Volume (CC 21 or CC 10)
    if (msgType === 0xb0 && (d1 === 21 || d1 === 10)) {
      this.callbacks.onAction('masterVolume', (d2 / 127) * 100);
      return;
    }

    // Filters (CC 23 ch 0 -> Deck A, CC 23 ch 1 -> Deck B)
    if (msgType === 0xb0 && d1 === 23) {
      const norm = (d2 / 63.5) - 1; // -1 to +1
      if (channel === 0) this.callbacks.onAction('deckA_filter', norm);
      else this.callbacks.onAction('deckB_filter', norm);
      return;
    }

    // Play / Pause Buttons (Pioneer: Note 11 (0x0B))
    if (msgType === 0x90 && d2 > 0) {
      if (d1 === 11 || d1 === 0x0b) {
        if (channel === 0) this.callbacks.onAction('deckA_play');
        else this.callbacks.onAction('deckB_play');
        return;
      }
      // CUE Buttons (Pioneer: Note 12 (0x0C))
      if (d1 === 12 || d1 === 0x0c) {
        if (channel === 0) this.callbacks.onAction('deckA_cue');
        else this.callbacks.onAction('deckB_cue');
        return;
      }
      // SYNC Buttons (Pioneer: Note 88 (0x58))
      if (d1 === 88 || d1 === 0x58) {
        if (channel === 0) this.callbacks.onAction('deckA_sync');
        else this.callbacks.onAction('deckB_sync');
        return;
      }
      // Hot Cues (Notes 0, 1, 2, 3)
      if (d1 >= 0 && d1 <= 3) {
        const cueNum = d1 + 1;
        if (channel === 0) this.callbacks.onAction(`deckA_hotcue${cueNum}` as DjActionKey);
        else this.callbacks.onAction(`deckB_hotcue${cueNum}` as DjActionKey);
        return;
      }
    }
  }

  // Gamepad Loop
  private startGamepadPolling() {
    if (typeof window === 'undefined') return;

    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let anyGamepad = false;

      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
          anyGamepad = true;
          this.processGamepad(gp);
        }
      }

      this.gamepadLoopId = requestAnimationFrame(poll);
    };

    this.gamepadLoopId = requestAnimationFrame(poll);
  }

  private processGamepad(gp: Gamepad) {
    // Check buttons (Edge-triggered for taps)
    gp.buttons.forEach((btn, idx) => {
      const isPressed = btn.pressed || btn.value > 0.5;
      const wasPressed = this.prevGamepadButtons[idx] || false;

      if (isPressed && !wasPressed) {
        // Button A / Cross (Idx 0) -> Play Deck A
        if (idx === 0) this.callbacks.onAction('deckA_play');
        // Button B / Circle (Idx 1) -> Cue Deck A
        if (idx === 1) this.callbacks.onAction('deckA_cue');
        // Button X / Square (Idx 2) -> Play Deck B
        if (idx === 2) this.callbacks.onAction('deckB_play');
        // Button Y / Triangle (Idx 3) -> Cue Deck B
        if (idx === 3) this.callbacks.onAction('deckB_cue');
        // LB (Idx 4) -> Airhorn stab
        if (idx === 4) this.callbacks.onAction('airhorn');
        // RB (Idx 5) -> Sync both decks
        if (idx === 5) {
          this.callbacks.onAction('deckA_sync');
          this.callbacks.onAction('deckB_sync');
        }
      }
      this.prevGamepadButtons[idx] = isPressed;
    });

    // Left Stick X Axis -> Crossfader
    if (gp.axes && gp.axes.length > 0) {
      const stickX = gp.axes[0];
      if (Math.abs(stickX) > 0.15) {
        this.callbacks.onAction('crossfader', stickX);
      }
    }
  }

  public startLearn(action: DjActionKey) {
    this.learningAction = action;
  }

  public cancelLearn() {
    this.learningAction = null;
  }

  public resetCustomMappings() {
    this.customMidiMap = {};
    localStorage.removeItem(STORAGE_KEY);
  }

  public getConnectedDevices(): ControllerDevice[] {
    const list = Array.from(this.connectedDevices.values());
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gps = navigator.getGamepads();
      for (const gp of gps) {
        if (gp && gp.connected) {
          list.push({
            id: `gp-${gp.index}`,
            type: 'gamepad',
            name: gp.id || 'USB Gamepad Controller',
            connected: true,
          });
        }
      }
    }
    return list;
  }

  private notifyDevices() {
    if (this.callbacks.onDeviceChange) {
      this.callbacks.onDeviceChange(this.getConnectedDevices());
    }
  }

  public destroy() {
    if (this.gamepadLoopId) {
      cancelAnimationFrame(this.gamepadLoopId);
    }
  }
}
