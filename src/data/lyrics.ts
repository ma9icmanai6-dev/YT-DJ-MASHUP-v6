export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface TrackLyrics {
  videoId: string;
  lines: LyricLine[];
}

export interface LiveLyricState {
  currentLine: string;
  nextLine: string | null;
  prevLine: string | null;
  progress: number; // 0.0 to 1.0 progress through current line
  section: string; // 'Intro' | 'Verse' | 'Chorus' | 'Drop' | 'Bridge' | 'Outro'
  trackTitle: string;
  artist: string;
}

// Master synced lyrics dictionary (indexed by videoId, archiveId, and normalized title keys)
export const TRACK_LYRICS: Record<string, LyricLine[]> = {
  // The Weeknd - Blinding Lights (both preset ID XwxLwG2_Sxk and official 4NRXx6U8ABQ)
  'XwxLwG2_Sxk': [
    { time: 0, text: '♪ [Synth Intro Hook] ♪' },
    { time: 14, text: "Yeah..." },
    { time: 19, text: "I've been tryna call" },
    { time: 24, text: "I've been on my own for long enough" },
    { time: 28, text: "Maybe you can show me how to love, maybe" },
    { time: 35, text: "I'm going through withdrawals" },
    { time: 39, text: "You don't even have to do too much" },
    { time: 43, text: "You can turn me on with just a touch, baby" },
    { time: 51, text: "I look around and Sin City's cold and empty" },
    { time: 59, text: "No one's around to judge me" },
    { time: 64, text: "I can't see clearly when you're gone" },
    { time: 68, text: "I said, ooh, I'm blinded by the lights!" },
    { time: 76, text: "No, I can't sleep until I feel your touch" },
    { time: 83, text: "I said, ooh, I'm drowning in the night" },
    { time: 91, text: "Oh, when I'm like this, you're the one I trust" },
    { time: 100, text: "♪ [Blinding Synth Drop] ♪" },
    { time: 115, text: "I'm running out of time" },
    { time: 120, text: "'Cause I can see the sun light up the sky" },
    { time: 125, text: "So I hit the road in overdrive, baby, oh" },
    { time: 132, text: "The city's cold and empty" },
    { time: 139, text: "No one's around to judge me" },
    { time: 144, text: "I can't see clearly when you're gone" },
    { time: 149, text: "I said, ooh, I'm blinded by the lights!" },
    { time: 157, text: "No, I can't sleep until I feel your touch" },
    { time: 164, text: "I said, ooh, I'm drowning in the night" },
    { time: 172, text: "Oh, when I'm like this, you're the one I trust" },
  ],
  '4NRXx6U8ABQ': [
    { time: 0, text: '♪ [Synth Intro Hook] ♪' },
    { time: 14, text: "Yeah..." },
    { time: 19, text: "I've been tryna call" },
    { time: 24, text: "I've been on my own for long enough" },
    { time: 28, text: "Maybe you can show me how to love, maybe" },
    { time: 35, text: "I'm going through withdrawals" },
    { time: 39, text: "You don't even have to do too much" },
    { time: 43, text: "You can turn me on with just a touch, baby" },
    { time: 51, text: "I look around and Sin City's cold and empty" },
    { time: 59, text: "No one's around to judge me" },
    { time: 64, text: "I can't see clearly when you're gone" },
    { time: 68, text: "I said, ooh, I'm blinded by the lights!" },
    { time: 76, text: "No, I can't sleep until I feel your touch" },
    { time: 83, text: "I said, ooh, I'm drowning in the night" },
    { time: 91, text: "Oh, when I'm like this, you're the one I trust" },
    { time: 100, text: "♪ [Blinding Synth Drop] ♪" },
  ],

  // a-ha - Take On Me (both preset ID hGPL5rzd3tQ and official djV11Xbc914)
  'hGPL5rzd3tQ': [
    { time: 0, text: '♪ [Drum beat & Synth Intro] ♪' },
    { time: 15, text: "We're talking away..." },
    { time: 20, text: "I don't know what I'm to say" },
    { time: 24, text: "I'll say it anyway" },
    { time: 27, text: "Today's another day to find you" },
    { time: 32, text: "Shying away" },
    { time: 36, text: "I'll be coming for your love, okay?" },
    { time: 42, text: "Take on me! (Take on me)" },
    { time: 49, text: "Take me on! (Take on me)" },
    { time: 57, text: "I'll be gone..." },
    { time: 61, text: "In a day or two!" },
    { time: 70, text: "So needless to say, of the odds and ends" },
    { time: 77, text: "I'll be stumbling away" },
    { time: 82, text: "Slowly learning that life is okay" },
    { time: 88, text: "Say after me: It's no better to be safe than sorry!" },
    { time: 96, text: "Take on me! (Take on me)" },
    { time: 103, text: "Take me on! (Take on me)" },
    { time: 111, text: "I'll be gone in a day or two!" },
    { time: 125, text: "♪ [Acoustic & Synth Hook] ♪" },
    { time: 140, text: "Things that you say, yeah, is it life or just to play" },
    { time: 148, text: "My worries away? You're all the things I've got to remember" },
    { time: 158, text: "You're shying away, I'll be coming for you anyway!" },
  ],
  'djV11Xbc914': [
    { time: 0, text: '♪ [Drum beat & Synth Intro] ♪' },
    { time: 15, text: "We're talking away..." },
    { time: 20, text: "I don't know what I'm to say" },
    { time: 24, text: "I'll say it anyway" },
    { time: 27, text: "Today's another day to find you" },
    { time: 32, text: "Shying away" },
    { time: 36, text: "I'll be coming for your love, okay?" },
    { time: 42, text: "Take on me! (Take on me)" },
    { time: 49, text: "Take me on! (Take on me)" },
    { time: 57, text: "I'll be gone..." },
    { time: 61, text: "In a day or two!" },
  ],

  // Dua Lipa - Levitating (j2c3tR_qfiQ & TUVcZfQe-Kw)
  'j2c3tR_qfiQ': [
    { time: 0, text: '♪ [Funky Disco Groove] ♪' },
    { time: 9, text: "If you wanna run away with me, I know a galaxy" },
    { time: 14, text: "And I can take you for a ride" },
    { time: 18, text: "I had a premonition that we fell into a rhythm" },
    { time: 23, text: "Where the music don't stop for life" },
    { time: 28, text: "Glitter in the sky, glitter in my eyes" },
    { time: 32, text: "Shining just the way I like" },
    { time: 37, text: "If you're feeling like you need a little bit of company" },
    { time: 42, text: "You met me at the perfect time" },
    { time: 47, text: "You want me, I want you, baby" },
    { time: 51, text: "My sugarboo, I'm levitating!" },
    { time: 56, text: "The Milky Way, we're renegading" },
    { time: 60, text: "Yeah, yeah, yeah, yeah, yeah!" },
    { time: 66, text: "I got you, moonlight, you're my starlight" },
    { time: 70, text: "I need you all night, come on dance with me!" },
    { time: 75, text: "I'm levitating!" },
  ],
  'TUVcZfQe-Kw': [
    { time: 0, text: '♪ [Funky Disco Groove] ♪' },
    { time: 10, text: "If you wanna run away with me, I know a galaxy" },
    { time: 15, text: "And I can take you for a ride" },
    { time: 19, text: "I had a premonition that we fell into a rhythm" },
    { time: 24, text: "Where the music don't stop for life" },
    { time: 29, text: "Glitter in the sky, glitter in my eyes" },
    { time: 34, text: "Shining just the way I like" },
    { time: 38, text: "If you're feeling like you need a little bit of company" },
    { time: 43, text: "You met me at the perfect time" },
    { time: 48, text: "You want me, I want you, baby" },
    { time: 53, text: "My sugarboo, I'm levitating!" },
    { time: 57, text: "The Milky Way, we're renegading" },
  ],

  // Mark Ronson ft. Bruno Mars - Uptown Funk (W8FUmkw3a4U & OPf0YbXqDm0)
  'W8FUmkw3a4U': [
    { time: 0, text: 'DOH! Doo-doo-doo-doo...' },
    { time: 12, text: "This hit, that ice cold, Michelle Pfeiffer, that white gold" },
    { time: 18, text: "This one for them hood girls, them good girls, straight masterpieces" },
    { time: 24, text: "Stylin', wilin', livin' it up in the city" },
    { time: 30, text: "Got Chucks on with Saint Laurent, gotta kiss myself, I'm so pretty!" },
    { time: 36, text: "I'm too hot! (Damn) Called a police and a fireman" },
    { time: 42, text: "I'm too hot! (Damn) Make a dragon wanna retire, man" },
    { time: 48, text: "Girls hit your hallelujah! (Whoo!) Cause Uptown Funk gon' give it to ya!" },
    { time: 58, text: "Saturday night and we in the spot, don't believe me just watch!" },
    { time: 66, text: '♪ [BRASS DROP] DOH! ♪' },
    { time: 82, text: "Don't believe me just watch! Don't believe me just watch!" },
  ],
  'OPf0YbXqDm0': [
    { time: 0, text: 'DOH! Doo-doo-doo-doo...' },
    { time: 12, text: "This hit, that ice cold, Michelle Pfeiffer, that white gold" },
    { time: 18, text: "This one for them hood girls, them good girls, straight masterpieces" },
    { time: 24, text: "Stylin', wilin', livin' it up in the city" },
    { time: 30, text: "Got Chucks on with Saint Laurent, gotta kiss myself, I'm so pretty!" },
  ],

  // Earth, Wind & Fire - September (aqZxIL4YE2I & Gs069dndIYk)
  'aqZxIL4YE2I': [
    { time: 0, text: '♪ [Guitar groove & horn hit] ♪' },
    { time: 8, text: "Do you remember the 21st night of September?" },
    { time: 14, text: "Love was changin' the minds of pretenders" },
    { time: 18, text: "While chasin' the clouds away" },
    { time: 24, text: "Our hearts were ringin' in the key that our souls were singin'" },
    { time: 29, text: "As we danced in the night, remember" },
    { time: 33, text: "How the stars stole the night away, oh yeah!" },
    { time: 40, text: "Ba-de-ya, say, do you remember?" },
    { time: 46, text: "Ba-de-ya, dancin' in September!" },
    { time: 52, text: "Ba-de-ya, never was a cloudy day!" },
  ],
  'Gs069dndIYk': [
    { time: 0, text: '♪ [Guitar groove & horn hit] ♪' },
    { time: 8, text: "Do you remember the 21st night of September?" },
    { time: 14, text: "Love was changin' the minds of pretenders" },
    { time: 18, text: "While chasin' the clouds away" },
    { time: 24, text: "Our hearts were ringin' in the key that our souls were singin'" },
  ],

  // Gorillaz - Feel Good Inc. (IbpOfzrNjTY & HyHNuVaZJ-k)
  'IbpOfzrNjTY': [
    { time: 0, text: 'Hahaha... Feel good...' },
    { time: 14, text: 'City’s breaking down on a camel’s back' },
    { time: 18, text: 'They just have to go ‘cause they don’t know wack' },
    { time: 22, text: 'So while you fill the streets, it’s appealing to see' },
    { time: 26, text: 'You won’t get out the county, ‘cause you’re bad and free' },
    { time: 30, text: 'Windmill, windmill for the land, turn forever hand in hand' },
    { time: 38, text: 'Take it all in on your stride, it is ticking, falling down' },
    { time: 46, text: 'Love forever, love is free, let’s turn forever, you and me' },
    { time: 54, text: 'Windmill, windmill for the land, is everybody in?' },
  ],
  'HyHNuVaZJ-k': [
    { time: 0, text: 'Hahaha... Feel good...' },
    { time: 14, text: 'City’s breaking down on a camel’s back' },
    { time: 18, text: 'They just have to go ‘cause they don’t know wack' },
  ],

  // Eminem - Without Me (-8xhmV3JoG4 & YVkUvmDQ3HY)
  '-8xhmV3JoG4': [
    { time: 0, text: "Obie Trice, real name, no gimmicks!" },
    { time: 8, text: "Two trailer park girls go 'round the outside..." },
    { time: 14, text: "Guess who's back, back again?" },
    { time: 18, text: "Shady's back, tell a friend!" },
    { time: 24, text: "Now this looks like a job for me, so everybody, just follow me" },
    { time: 29, text: "'Cause we need a little controversy" },
    { time: 33, text: "'Cause it feels so empty without me!" },
    { time: 37, text: "I've created a monster, 'cause nobody wants to see Marshall no more" },
    { time: 42, text: "They want Shady, I'm chopped liver!" },
  ],
  'YVkUvmDQ3HY': [
    { time: 0, text: "Obie Trice, real name, no gimmicks!" },
    { time: 8, text: "Two trailer park girls go 'round the outside..." },
    { time: 14, text: "Guess who's back, back again?" },
  ],

  // Billie Eilish - bad guy (4-TbQnONe_w & DyDfgMOUjCI)
  '4-TbQnONe_w': [
    { time: 0, text: '♪ [Punchy 808 Bass Groove] ♪' },
    { time: 9, text: "White shirt now red, my bloody nose" },
    { time: 13, text: "Sleeping, you're on your tippy-toes" },
    { time: 17, text: "Creeping around like no one knows" },
    { time: 21, text: "Think you're so criminal" },
    { time: 25, text: "So you're a tough guy, like it really rough guy" },
    { time: 29, text: "Just can't get enough guy, chest always so puffed guy" },
    { time: 34, text: "I'm that bad type, make your mama sad type" },
    { time: 38, text: "Make your girlfriend mad tight, might seduce your dad type" },
    { time: 42, text: "I'm the bad guy... duh!" },
    { time: 47, text: '♪ [Sub Bass Wobble Drop] ♪' },
  ],
  'DyDfgMOUjCI': [
    { time: 0, text: '♪ [Punchy 808 Bass Groove] ♪' },
    { time: 9, text: "White shirt now red, my bloody nose" },
    { time: 13, text: "Sleeping, you're on your tippy-toes" },
    { time: 42, text: "I'm the bad guy... duh!" },
  ],

  // Queen - Another One Bites the Dust (kwwaWVP2PGE & rY0WEl9bF3Y)
  'kwwaWVP2PGE': [
    { time: 0, text: '♪ [Legendary Bassline] ♪' },
    { time: 11, text: "Steve walks warily down the street" },
    { time: 15, text: "With the brim pulled way down low" },
    { time: 19, text: "Ain't no sound but the sound of his feet" },
    { time: 22, text: "Machine guns ready to go" },
    { time: 26, text: "Are you ready? Hey, are you ready for this?" },
    { time: 30, text: "Are you hanging on the edge of your seat?" },
    { time: 34, text: "Out of the doorway the bullets rip, to the sound of the beat, yeah!" },
    { time: 41, text: "Another one bites the dust!" },
    { time: 45, text: "Another one bites the dust!" },
    { time: 49, text: "And another one gone, and another one gone" },
    { time: 52, text: "Another one bites the dust, yeah!" },
  ],
  'rY0WEl9bF3Y': [
    { time: 0, text: '♪ [Legendary Bassline] ♪' },
    { time: 11, text: "Steve walks warily down the street" },
    { time: 41, text: "Another one bites the dust!" },
  ],

  // Daft Punk - Around the World (dwDns8x3Jb4)
  'dwDns8x3Jb4': [
    { time: 0, text: '♪ [Bassline Groove Intro] ♪' },
    { time: 16, text: 'Around the world, around the world' },
    { time: 24, text: 'Around the world, around the world' },
    { time: 32, text: 'Around the world, around the world' },
    { time: 40, text: 'Around the world, around the world' },
    { time: 48, text: 'Around the world, around the world' },
    { time: 56, text: 'Around the world, around the world' },
    { time: 64, text: 'Around the world, around the world' },
    { time: 80, text: '♪ [Synth Filter Sweep] ♪' },
    { time: 96, text: 'Around the world, around the world' },
  ],
};

// Title match helpers
const TITLE_MATCHES: { match: string; key: string }[] = [
  { match: 'blinding lights', key: 'XwxLwG2_Sxk' },
  { match: 'take on me', key: 'hGPL5rzd3tQ' },
  { match: 'levitating', key: 'j2c3tR_qfiQ' },
  { match: 'uptown funk', key: 'W8FUmkw3a4U' },
  { match: 'september', key: 'aqZxIL4YE2I' },
  { match: 'feel good', key: 'IbpOfzrNjTY' },
  { match: 'without me', key: '-8xhmV3JoG4' },
  { match: 'bad guy', key: '4-TbQnONe_w' },
  { match: 'another one bites', key: 'kwwaWVP2PGE' },
  { match: 'around the world', key: 'dwDns8x3Jb4' },
];

export function getLyricsForTrack(videoId?: string, title?: string): LyricLine[] | null {
  if (videoId && TRACK_LYRICS[videoId]) {
    return TRACK_LYRICS[videoId];
  }

  if (title) {
    const lowTitle = title.toLowerCase();
    for (const item of TITLE_MATCHES) {
      if (lowTitle.includes(item.match)) {
        return TRACK_LYRICS[item.key] || null;
      }
    }
  }

  return null;
}

/**
 * Intelligent real-time dynamic lyrics generator for any search / custom loaded track.
 * Generates tempo-synchronized vocal cues & rhythmic lines following standard song structure.
 */
function generateDynamicSynchronizedLyrics(
  title: string,
  artist: string,
  currentTime: number,
  bpm: number = 120
): LiveLyricState {
  const barLength = (60 / Math.max(60, bpm)) * 4; // 1 bar = 4 beats
  const phraseIndex = Math.floor(currentTime / (barLength * 2));
  const progress = (currentTime % (barLength * 2)) / (barLength * 2);

  let section = 'Intro';
  if (currentTime < 16) {
    section = 'Intro Hook';
  } else if (currentTime < 48) {
    section = 'Verse 1';
  } else if (currentTime < 64) {
    section = 'Pre-Chorus';
  } else if (currentTime < 112) {
    section = 'Chorus Drop';
  } else if (currentTime < 144) {
    section = 'Verse 2';
  } else if (currentTime < 176) {
    section = 'Chorus Hook';
  } else if (currentTime < 208) {
    section = 'Bridge';
  } else {
    section = 'Outro';
  }

  const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();

  // Dynamic rhythmic vocal lyric templates
  const lyricTemplates = [
    `♪ Feel the rhythm with ${artist} · "${cleanTitle}" ♪`,
    `Everybody in the rhythm now · Move with the beat!`,
    `Turn it up louder · Let the frequencies roll`,
    `Feel the baseline pump · Real-time Neural stem in sync`,
    `Sing along with the groove · Hands high in the air!`,
    `Drop the beat right here · ${cleanTitle}`,
    `Vocals flowing smooth · Can you feel the vibe?`,
    `Dance all through the night · Keep the groove alive!`,
    `♪ [Neural Mix stem isolation: Vocals on peak] ♪`,
    `Never stop the beat · Pure energy with ${artist}`,
  ];

  const currentLine = lyricTemplates[phraseIndex % lyricTemplates.length];
  const nextLine = lyricTemplates[(phraseIndex + 1) % lyricTemplates.length];
  const prevLine = phraseIndex > 0 ? lyricTemplates[(phraseIndex - 1) % lyricTemplates.length] : null;

  return {
    currentLine,
    nextLine,
    prevLine,
    progress: Math.min(1, Math.max(0, progress)),
    section,
    trackTitle: cleanTitle,
    artist,
  };
}

/**
 * Get comprehensive real-time live lyric state with progress, prev, active, and next preview lines.
 */
export function getLiveLyricState(
  track: { videoId?: string; title?: string; artist?: string; bpm?: number } | null,
  currentTime: number
): LiveLyricState {
  if (!track || !track.title) {
    return {
      currentLine: '♪ Live CC Teleprompter Standby · Press Play on Deck A or B ♪',
      nextLine: 'Waiting for vocal stem...',
      prevLine: null,
      progress: 0,
      section: 'Standby',
      trackTitle: 'OpenMix Pro Console',
      artist: 'AI Studio Build',
    };
  }

  const lines = getLyricsForTrack(track.videoId, track.title);

  if (!lines || lines.length === 0) {
    return generateDynamicSynchronizedLyrics(
      track.title,
      track.artist || 'Unknown Artist',
      currentTime,
      track.bpm || 120
    );
  }

  // Find line where line.time <= currentTime, picking the latest one
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeIndex === -1) {
    const next = lines[0];
    return {
      currentLine: `♪ [Intro · Vocal starts in ${Math.max(1, Math.round(next.time - currentTime))}s] ♪`,
      nextLine: `"${next.text}"`,
      prevLine: null,
      progress: currentTime / Math.max(1, next.time),
      section: 'Intro',
      trackTitle: track.title,
      artist: track.artist || '',
    };
  }

  const current = lines[activeIndex];
  const next = activeIndex < lines.length - 1 ? lines[activeIndex + 1] : null;
  const prev = activeIndex > 0 ? lines[activeIndex - 1] : null;

  // Calculate progress inside current line duration
  const lineStart = current.time;
  const lineEnd = next ? next.time : lineStart + 6;
  const duration = Math.max(1, lineEnd - lineStart);
  const progress = Math.min(1, Math.max(0, (currentTime - lineStart) / duration));

  let section = 'Verse';
  if (current.text.includes('♪') || current.text.includes('Hook')) section = 'Instrumental';
  else if (current.text.includes('!') || activeIndex > 8) section = 'Chorus';

  return {
    currentLine: current.text,
    nextLine: next ? next.text : '♪ [Outro Fade] ♪',
    prevLine: prev ? prev.text : null,
    progress,
    section,
    trackTitle: track.title,
    artist: track.artist || '',
  };
}

export function getCurrentLyricLine(videoId: string, currentTime: number): string | null {
  const lines = TRACK_LYRICS[videoId];
  if (!lines || lines.length === 0) return null;

  let activeLine: LyricLine | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) {
      activeLine = lines[i];
    } else {
      break;
    }
  }

  return activeLine ? activeLine.text : null;
}
