/* ==========================================================================
   THE SYSTEM: AWAKENING - Client Logic & Audio Synthesizer
   Matches System HUD Modal UI
   ========================================================================== */

// --- Web Audio API Sci-Fi Synthesizer (Zero external dependencies) ---
class SystemAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Futuristic tech hover tick
  playHover() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (_) {}
  }

  // Tech option select blip
  playSelect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(950, this.ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (_) {}
  }

  // Solo Leveling Awakening Quest fanfare (ascending triumphant arpeggio)
  playAwakening() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C E G C E G C
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + (idx * 0.09);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch (_) {}
  }

  // Sci-fi error / warning buzzer
  playError() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.setValueAtTime(120, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (_) {}
  }

  // Solo Leveling Death / Penalty doom impact + glitch
  playDeath() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // 1. Heavy sub-bass thud (doom impact)
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(150, this.ctx.currentTime);
      bassOsc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.38);

      bassGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start();
      bassOsc.stop(this.ctx.currentTime + 0.38);

      // 2. High discordant glitch alarm
      const glitchOsc = this.ctx.createOscillator();
      const glitchGain = this.ctx.createGain();
      glitchOsc.type = 'square';
      glitchOsc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.04);
      glitchOsc.frequency.setValueAtTime(233.08, this.ctx.currentTime + 0.12);
      glitchOsc.frequency.setValueAtTime(116.54, this.ctx.currentTime + 0.22);

      glitchGain.gain.setValueAtTime(0.12, this.ctx.currentTime + 0.04);
      glitchGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      glitchOsc.connect(glitchGain);
      glitchGain.connect(this.ctx.destination);
      glitchOsc.start(this.ctx.currentTime + 0.04);
      glitchOsc.stop(this.ctx.currentTime + 0.35);
    } catch (_) {}
  }
}

const sfx = new SystemAudio();

// Handle "ALL" toggle in Hunter Path
function setupHunterPathLogic() {
  const checkboxes = document.querySelectorAll('input[name="hunterPath"]');
  const allCheckbox = document.querySelector('input[name="hunterPath"][value="All"]');
  const otherCheckboxes = Array.from(checkboxes).filter(cb => cb.value !== 'All');

  if (allCheckbox) {
    allCheckbox.addEventListener('change', () => {
      sfx.playSelect();
      if (allCheckbox.checked) {
        otherCheckboxes.forEach(cb => cb.checked = true);
      } else {
        otherCheckboxes.forEach(cb => cb.checked = false);
      }
    });
  }

  otherCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      sfx.playSelect();
      if (!cb.checked && allCheckbox) {
        allCheckbox.checked = false;
      } else if (allCheckbox && otherCheckboxes.every(c => c.checked)) {
        allCheckbox.checked = true;
      }
    });
  });
}

// Setup Interactive SFX
function setupInteractiveSounds() {
  // Option pills & cards
  document.querySelectorAll('.device-card-btn, .pill-option-btn, .activity-card-box, .bug-report-bar').forEach(el => {
    el.addEventListener('mouseenter', () => sfx.playHover());
    el.addEventListener('click', () => sfx.playSelect());
  });

  // Inputs
  document.querySelectorAll('.hud-text-input').forEach(input => {
    input.addEventListener('focus', () => sfx.playHover());
  });

  // Sound toggle button
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const isMuted = sfx.toggleMute();
      soundBtn.innerHTML = isMuted 
        ? '🔇 <span>SFX: OFF</span>' 
        : '🔊 <span>SFX: ON</span>';
      if (!isMuted) sfx.playSelect();
    });
  }
}

// Setup Form Submission
function setupFormSubmission() {
  const form = document.getElementById('application-form');
  const submitBtn = document.getElementById('submit-btn');
  const errorBanner = document.getElementById('form-error-msg');
  const modalBackdrop = document.getElementById('system-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close-btn');

  function showFormError(targetEl, msg) {
    sfx.playError();
    if (errorBanner) {
      errorBanner.textContent = `⚠ [SYSTEM WARNING] ${msg}`;
      errorBanner.style.display = 'block';
    }
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof targetEl.focus === 'function') targetEl.focus();
      targetEl.classList.add('field-error-highlight');
      setTimeout(() => targetEl.classList.remove('field-error-highlight'), 2500);
    }
  }

  function clearFormError() {
    if (errorBanner) errorBanner.style.display = 'none';
  }

  // Clear error when user changes input
  if (form) {
    form.addEventListener('input', clearFormError);
    form.addEventListener('change', clearFormError);
  }

  function closeModal() {
    sfx.playHover();
    if (modalBackdrop) modalBackdrop.classList.remove('open');
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError();

    // 1. Discord
    const discordUsername = form.discordUsername.value.trim();
    if (!discordUsername) {
      showFormError(form.discordUsername, 'DISCORD USERNAME IS REQUIRED');
      return;
    }

    // 2. Device
    const deviceEl = form.querySelector('input[name="device"]:checked');
    if (!deviceEl) {
      showFormError(document.getElementById('discordUsername'), 'SELECT YOUR TARGET DEVICE PLATFORM');
      return;
    }
    const device = deviceEl.value;

    // 3. Hunter Path
    const pathEls = form.querySelectorAll('input[name="hunterPath"]:checked');
    if (pathEls.length === 0) {
      showFormError(document.querySelector('.pills-flex-wrap'), 'SELECT AT LEAST ONE HUNTER PATH');
      return;
    }
    const hunterPath = Array.from(pathEls).map(cb => cb.value);

    // 4. Activity
    const activityEl = form.querySelector('input[name="activity"]:checked');
    if (!activityEl) {
      showFormError(document.querySelector('.activity-cards-grid'), 'SPECIFY YOUR DAILY ACTIVITY LEVEL');
      return;
    }
    const activity = activityEl.value;

    // 5. Bug report [REQUIRED]
    const reportBugsEl = form.querySelector('input[name="reportBugs"]:checked');
    if (!reportBugsEl) {
      showFormError(document.querySelector('.bug-report-bar'), 'CONFIRMATION OF BUG REPORTING IS REQUIRED');
      return;
    }
    const reportBugs = true;

    // 6. Email (optional)
    const email = form.email.value.trim();

    // 7. How did you find us? (multi-select)
    const sourceEls = form.querySelectorAll('input[name="source"]:checked');
    if (sourceEls.length === 0) {
      showFormError(document.querySelectorAll('.pills-flex-wrap')[1] || submitBtn, 'SELECT HOW YOU DISCOVERED THE SYSTEM');
      return;
    }
    const source = Array.from(sourceEls).map(cb => cb.value);

    // Submit state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>TRANSMITTING TO THE SYSTEM...</span>`;

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordUsername,
          device,
          hunterPath,
          activity,
          reportBugs,
          email,
          source
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Transmission failed.');
      }

      // Success! Play awakening fanfare!
      sfx.playAwakening();

      // Show Awakening Modal
      const hunter = data.hunter;
      modalTitle.innerHTML = `<span>⚡ [SYSTEM NOTIFICATION] AWAKENING SUCCESSFUL!</span>`;
      modalContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 14px;">
          <div style="font-size: 2.4rem; filter: drop-shadow(0 0 10px #00d2ff); margin-bottom: 4px;">👑</div>
          <div style="font-family: var(--font-hud); font-size: 1.15rem; color: var(--cyan-bright); font-weight: 700; letter-spacing: 1px;">
            FOUNDER HUNTER REGISTERED
          </div>
          <div style="font-family: var(--font-tech); font-size: 0.88rem; color: var(--text-muted); margin-top: 4px;">
            Your coordinates have been sealed in THE SYSTEM archives.
          </div>
        </div>

        <div class="hunter-badge-card">
          <div class="hunter-badge-row"><span class="label">HUNTER ID:</span><span class="val">${hunter.id}</span></div>
          <div class="hunter-badge-row"><span class="label">DISCORD:</span><span class="val">${hunter.discordUsername}</span></div>
          <div class="hunter-badge-row"><span class="label">PLATFORM:</span><span class="val">${hunter.device}</span></div>
          <div class="hunter-badge-row"><span class="label">PATH:</span><span class="val">${hunter.hunterPath.join(', ')}</span></div>
          <div class="hunter-badge-row"><span class="label">ACTIVITY:</span><span class="val" style="color:var(--gold-accent)">${hunter.activity}</span></div>
          <div class="hunter-badge-row"><span class="label">RANK:</span><span class="val" style="color:var(--neon-green)">FOUNDER CANDIDATE</span></div>
        </div>

        <div style="background: rgba(0, 210, 255, 0.08); border: 1px solid var(--cyan-border); padding: 12px; border-radius: 3px; font-family: var(--font-tech); font-size: 0.85rem; color: #bdefff; line-height: 1.4; margin-top: 12px; text-align: center;">
          Watch your Discord for the closed beta deployment invitation!
        </div>

        <div class="hud-modal-discord-btn coming-soon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          <span>OFFICIAL HUNTER DISCORD &bull; COMING SOON</span>
        </div>
      `;

      modalBackdrop.classList.add('open');

      // Reset form
      form.reset();

    } catch (err) {
      alert(`System Error: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>SUBMIT &rarr;</span>`;
    }
  });
}

// --- Ambient Mana Particles / Sprites Background Engine ---
function initSystemParticles() {
  const canvas = document.getElementById('system-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(Math.floor((width * height) / 16000), 75);
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedY: -(Math.random() * 0.45 + 0.12),
      speedX: (Math.random() - 0.5) * 0.25,
      baseAlpha: Math.random() * 0.5 + 0.25,
      pulseSpeed: Math.random() * 0.025 + 0.015,
      pulseOffset: Math.random() * Math.PI * 2,
      isDiamond: Math.random() > 0.8
    });
  }

  let t = 0;
  function animate() {
    ctx.clearRect(0, 0, width, height);
    t++;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.speedY;
      p.x += p.speedX;

      // Wrap around edges
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const alpha = Math.max(
        0.1,
        Math.min(0.9, p.baseAlpha + Math.sin(t * p.pulseSpeed + p.pulseOffset) * 0.35)
      );

      ctx.save();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;

      if (p.isDiamond) {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// --- Solo Leveling Complete Intro Sequence (1. Boot -> 2. Modal -> 3. Form) ---
function setupIntroFlow() {
  const stageOverlay = document.getElementById('system-stage-overlay');
  const bootBox = document.getElementById('boot-terminal-box');
  const bootBar = document.getElementById('boot-bar-fill');
  const l2 = document.getElementById('boot-l2');
  const l3 = document.getElementById('boot-l3');
  const l4 = document.getElementById('boot-l4');

  const welcomeBox = document.getElementById('welcome-modal-box');
  const deathBox = document.getElementById('death-modal-box');
  const acceptBtn = document.getElementById('accept-quest-btn');
  const declineBtn = document.getElementById('decline-quest-btn');
  const resurrectBtn = document.getElementById('resurrect-btn');
  const warningText = document.getElementById('decline-warning-text');
  const formWrapper = document.getElementById('main-survey-container');
  const discordInput = document.getElementById('discordUsername');

  let isBootFinished = false;

  function transitionToWelcomeModal() {
    if (!bootBox || !welcomeBox) return;

    // Fade out Boot Box while KEEPING the stage overlay background & blur 100% active
    bootBox.classList.add('fading-out');

    setTimeout(() => {
      bootBox.style.display = 'none';
      welcomeBox.style.display = 'block';
      welcomeBox.classList.add('fading-in');
      sfx.playSelect();
    }, 220);
  }

  function finishBoot() {
    if (isBootFinished) return;
    isBootFinished = true;
    sfx.playHover();
    if (bootBar) bootBar.style.width = '100%';
    transitionToWelcomeModal();
  }

  // Allow click or key to skip boot screen immediately
  if (bootBox) {
    bootBox.addEventListener('click', finishBoot);
  }
  window.addEventListener('keydown', (e) => {
    if (!isBootFinished && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
      finishBoot();
    }
  });

  // Timed sequential line loading (~3.8s total so text is comfortably readable)
  setTimeout(() => {
    if (bootBar) bootBar.style.width = '20%';
  }, 100);

  setTimeout(() => {
    if (isBootFinished) return;
    if (bootBar) bootBar.style.width = '48%';
    if (l2) l2.classList.add('active');
    sfx.playHover();
  }, 900);

  setTimeout(() => {
    if (isBootFinished) return;
    if (bootBar) bootBar.style.width = '75%';
    if (l3) l3.classList.add('active');
    sfx.playHover();
  }, 1850);

  setTimeout(() => {
    if (isBootFinished) return;
    if (bootBar) bootBar.style.width = '94%';
    if (l4) l4.classList.add('active');
    sfx.playSelect();
  }, 2800);

  setTimeout(() => {
    if (isBootFinished) return;
    if (bootBar) bootBar.style.width = '100%';
  }, 3400);

  setTimeout(() => {
    finishBoot();
  }, 3850);

  // Setup Welcome Modal Interactions -> Form is immediately present on exit
  function acceptQuest() {
    sfx.playAwakening();
    if (formWrapper) {
      formWrapper.style.display = 'block';
      if (discordInput) discordInput.focus();
    }
    if (stageOverlay) {
      stageOverlay.classList.add('dismissed');
      setTimeout(() => {
        stageOverlay.style.display = 'none';
      }, 350);
    }
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', acceptQuest);
  }

  // Easter Egg: YOU DIED / Solo Leveling Penalty Zone Screen
  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      sfx.playDeath();
      if (stageOverlay) stageOverlay.classList.add('penalty-active');

      if (welcomeBox) {
        welcomeBox.classList.add('fading-out');
        setTimeout(() => {
          welcomeBox.style.display = 'none';
          if (deathBox) {
            deathBox.style.display = 'block';
            deathBox.classList.add('fading-in');
          }
        }, 220);
      }
    });
  }

  // Resurrect Button -> Awakens Player and brings them straight into the survey
  if (resurrectBtn) {
    resurrectBtn.addEventListener('click', () => {
      if (stageOverlay) stageOverlay.classList.remove('penalty-active');
      acceptQuest();
    });
  }

  // Key press support (Enter / Space accepts or resurrects)
  window.addEventListener('keydown', (e) => {
    if (isBootFinished && stageOverlay && !stageOverlay.classList.contains('dismissed')) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (deathBox && deathBox.style.display !== 'none') {
          if (stageOverlay) stageOverlay.classList.remove('penalty-active');
          acceptQuest();
        } else if (welcomeBox && welcomeBox.style.display !== 'none') {
          acceptQuest();
        }
      }
    }
  });
}

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  setupIntroFlow();
  initSystemParticles();
  setupHunterPathLogic();
  setupInteractiveSounds();
  setupFormSubmission();

  // Secret Hunter Admin Hotline: Ctrl + Shift + A (or Cmd + Shift + A)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.location.href = 'admin.html';
    }
  });
});
