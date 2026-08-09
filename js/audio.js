/* Moretti Official Artbook · Audio Engine v1 */
(() => {
  'use strict';

  const DEFAULTS = {
    basePath: 'assets/sounds/',
    mutedStorageKey: 'morettiSoundMuted',
    volumeStorageKey: 'morettiSoundMasterVolume',
    masterVolume: 1,
    sounds: {
      bookOpen:      { file:'book-opening.mp3',   volume:.42, overlap:false },
      pageTurn:      { file:'page-turn.mp3',      volume:.20, overlap:false },
      pageTurnHeavy: { file:'page-turn-heavy.mp3',volume:.22, overlap:false },
      albumTurn:     { file:'album-turn.wav',     volume:.18, overlap:false },
      mansionTurn:   { file:'mansion-turn.wav',   volume:.18, overlap:false },
      typewriter:    { file:'typewriter.wav',     volume:.10, overlap:false, loop:true },
      quoteTyping:   { file:'typewriter.wav',     volume:.16, overlap:false, loop:true },
      letterPaper:   { file:'letter-paper.wav',   volume:.16, overlap:false },
      stamp:         { file:'stamp.mp3',          volume:.52, overlap:false }
    }
  };

  let config = (typeof structuredClone === 'function') ? structuredClone(DEFAULTS) : JSON.parse(JSON.stringify(DEFAULTS));
  const clips = new Map();
  let unlocked = false;
  let muted = false;
  let masterVolume = 1;

  try {
    muted = localStorage.getItem(DEFAULTS.mutedStorageKey) === '1';
    const savedVol = Number(localStorage.getItem(DEFAULTS.volumeStorageKey));
    if (Number.isFinite(savedVol)) masterVolume = Math.max(0, Math.min(1, savedVol));
  } catch (_) {}

  function joinPath(base, file){
    if (/^(https?:|data:|blob:|\/)/i.test(file)) return file;
    return String(base || '').replace(/\/?$/, '/') + file.replace(/^\//,'');
  }

  function buildClip(name){
    const spec = config.sounds[name];
    if (!spec) return null;
    const a = new Audio(joinPath(config.basePath, spec.file));
    a.preload = 'auto';
    a.loop = !!spec.loop;
    a.volume = effectiveVolume(spec.volume);
    a.muted = muted;
    clips.set(name, a);
    return a;
  }

  function clip(name){
    return clips.get(name) || buildClip(name);
  }

  function effectiveVolume(v){
    return Math.max(0, Math.min(1, Number(v ?? 1) * masterVolume));
  }

  function refreshVolumes(){
    clips.forEach((a, name) => {
      const spec = config.sounds[name];
      if (spec) a.volume = effectiveVolume(spec.volume);
      a.muted = muted;
    });
  }

  async function unlock(){
    if (unlocked) return true;
    unlocked = true;
    const all = Object.keys(config.sounds).map(clip).filter(Boolean);
    for (const a of all){
      try{
        a.muted = true;
        const p = a.play();
        if (p && p.then) await p.catch(()=>{});
        a.pause();
        a.currentTime = 0;
        a.muted = muted;
      }catch(_){}
    }
    return true;
  }

  function play(name, options = {}){
    const spec = config.sounds[name];
    if (!spec || muted) return null;
    const a = clip(name);
    if (!a) return null;

    if (!spec.overlap){
      try { a.pause(); a.currentTime = options.offset ?? 0; } catch(_){}
    }

    a.loop = options.loop ?? !!spec.loop;
    a.volume = effectiveVolume(options.volume ?? spec.volume);
    a.muted = false;

    try{
      const p = a.play();
      if (p && p.catch) p.catch(()=>{});
    }catch(_){}
    return a;
  }

  function stop(name, reset = true){
    const a = clips.get(name);
    if (!a) return;
    try{
      a.pause();
      if (reset) a.currentTime = 0;
    }catch(_){}
  }

  function stopAll(){
    clips.forEach(a => {
      try{ a.pause(); a.currentTime = 0; }catch(_){}
    });
  }

  function setMuted(value){
    muted = !!value;
    refreshVolumes();
    try{ localStorage.setItem(config.mutedStorageKey, muted ? '1' : '0'); }catch(_){}
    window.dispatchEvent(new CustomEvent('moretti-audio-mutechange', {detail:{muted}}));
    return muted;
  }

  function toggleMute(){ return setMuted(!muted); }
  function isMuted(){ return muted; }

  function setMasterVolume(value){
    masterVolume = Math.max(0, Math.min(1, Number(value)));
    refreshVolumes();
    try{ localStorage.setItem(config.volumeStorageKey, String(masterVolume)); }catch(_){}
    window.dispatchEvent(new CustomEvent('moretti-audio-volumechange', {detail:{masterVolume}}));
    return masterVolume;
  }

  function getMasterVolume(){ return masterVolume; }

  function setSoundVolume(name, value){
    if (!config.sounds[name]) return;
    config.sounds[name].volume = Math.max(0, Math.min(1, Number(value)));
    refreshVolumes();
  }

  function configure(options = {}){
    if (options.basePath) config.basePath = options.basePath;
    if (options.mutedStorageKey) config.mutedStorageKey = options.mutedStorageKey;
    if (options.volumeStorageKey) config.volumeStorageKey = options.volumeStorageKey;
    if (options.sounds){
      for (const [name, spec] of Object.entries(options.sounds)){
        config.sounds[name] = {...(config.sounds[name] || {}), ...spec};
        clips.delete(name);
      }
    }
    if (options.masterVolume != null) setMasterVolume(options.masterVolume);
    return api;
  }

  function bindMuteButton(buttonOrSelector){
    const btn = typeof buttonOrSelector === 'string'
      ? document.querySelector(buttonOrSelector)
      : buttonOrSelector;
    if (!btn) return () => {};

    function sync(){
      const off = isMuted();
      btn.textContent = off ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', off ? 'false' : 'true');
      btn.title = off ? 'Sound off' : 'Sound on';
    }

    const handler = (e) => {
      e?.stopPropagation?.();
      unlock();
      toggleMute();
      sync();
    };
    btn.addEventListener('click', handler);
    window.addEventListener('moretti-audio-mutechange', sync);
    sync();

    return () => {
      btn.removeEventListener('click', handler);
      window.removeEventListener('moretti-audio-mutechange', sync);
    };
  }

  const api = {
    configure, unlock, play, stop, stopAll,
    setMuted, toggleMute, isMuted,
    setMasterVolume, getMasterVolume, setSoundVolume,
    bindMuteButton,
    openBook:      (o={}) => play('bookOpen', o),
    pageTurn:      (o={}) => play('pageTurn', o),
    pageTurnHeavy: (o={}) => play('pageTurnHeavy', o),
    albumTurn:     (o={}) => play('albumTurn', o),
    mansionTurn:   (o={}) => play('mansionTurn', o),
    typewriter:    (o={}) => {
      stop('quoteTyping');
      return play('typewriter', o);
    },
    quoteTyping:   (o={}) => {
      stop('typewriter');
      return play('quoteTyping', o);
    },
    stopQuoteTyping: () => stop('quoteTyping'),
    stopTyping: () => {
      stop('typewriter');
      stop('quoteTyping');
    },
    letterPaper:   (o={}) => play('letterPaper', o),
    stamp:         (o={}) => {
      stop('typewriter');
      stop('quoteTyping');
      return play('stamp', o);
    }
  };

  window.AudioManager = api;
})();
