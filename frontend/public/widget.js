(function () {
  // 1. Extract config from script tag
  const scriptTag = document.currentScript || Array.from(document.querySelectorAll('script')).find(s => s.src.includes('widget.js'));
  let orgToken = '';
  let apiHost = 'http://localhost:5000'; // Default backend port

  if (scriptTag) {
    const url = new URL(scriptTag.src, window.location.href);
    orgToken = url.searchParams.get('token') || '';
    // If the widget is loaded from localhost:3000, redirect backend to 5000
    if (url.origin.includes('3000')) {
      apiHost = 'http://localhost:5000';
    } else {
      // Guess backend is either at port 5000 or same host
      apiHost = url.origin.replace(':3000', ':5000');
    }
  }

  // Allow global override
  if (window.LeadFlowWidgetConfig) {
    if (window.LeadFlowWidgetConfig.token) orgToken = window.LeadFlowWidgetConfig.token;
    if (window.LeadFlowWidgetConfig.apiHost) apiHost = window.LeadFlowWidgetConfig.apiHost;
  }

  if (!orgToken) {
    console.error('LeadFlow-AI Widget: Missing token parameter. Add ?token=YOUR_TOKEN to script src.');
    return;
  }

  // 2. Inject CSS
  const css = `
    #lf-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #lf-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    #lf-launcher:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 12px 40px rgba(99, 102, 241, 0.6);
    }
    #lf-launcher svg {
      width: 28px;
      height: 28px;
      color: white;
      transition: transform 0.3s ease;
    }
    #lf-launcher.active svg {
      transform: rotate(90deg) scale(0.85);
    }
    #lf-card {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      height: auto;
      max-height: calc(100vh - 120px);
      background: rgba(10, 11, 28, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.1);
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    #lf-card.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    .lf-header {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%);
      padding: 20px;
      border-b: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .lf-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lf-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lf-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .lf-brand-text {
      color: white;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.5px;
    }
    .lf-subtitle {
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.4;
    }
    .lf-audio-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      padding: 6px 12px;
      border-radius: 12px;
      align-self: flex-start;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .lf-audio-btn {
      background: none;
      border: none;
      color: #cbd5e1;
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }
    .lf-audio-btn:hover { color: #6366f1; }
    .lf-audio-btn.active { color: #818cf8; }
    .lf-lang-select {
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      outline: none;
    }
    .lf-lang-select option {
      background: #0f172a;
      color: white;
    }
    .lf-content {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }
    .lf-form-group {
      margin-bottom: 16px;
      position: relative;
    }
    .lf-label {
      display: block;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .lf-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 14px;
      color: white;
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .lf-input:focus {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.04);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
    }
    .lf-consent-container {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 20px;
      margin-bottom: 20px;
    }
    .lf-checkbox {
      margin-top: 2px;
      accent-color: #6366f1;
      cursor: pointer;
    }
    .lf-consent-text {
      color: #64748b;
      font-size: 11px;
      line-height: 1.4;
      user-select: none;
      cursor: pointer;
    }
    .lf-consent-text strong {
      color: #cbd5e1;
    }
    .lf-submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: white;
      border: none;
      border-radius: 14px;
      padding: 12px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .lf-submit-btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
    }
    .lf-submit-btn:active {
      transform: translateY(0);
    }
    .lf-submit-btn:disabled {
      background: #334155;
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
    }
    .lf-success-screen {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      height: 100%;
      box-sizing: border-box;
    }
    .lf-success-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 30px;
      animation: pulseGreen 2s infinite;
    }
    @keyframes pulseGreen {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .lf-success-title {
      color: white;
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .lf-success-desc {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .lf-countdown {
      font-size: 32px;
      font-weight: 900;
      background: linear-gradient(135deg, #34d399 0%, #059669 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .lf-footer {
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-t: 1px solid rgba(255, 255, 255, 0.03);
      text-align: center;
      font-size: 10px;
      color: #475569;
    }
    .lf-footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: bold;
    }
    .lf-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: lf-spin 0.6s linear infinite;
    }
    @keyframes lf-spin {
      to { transform: rotate(360deg); }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = css;
  document.head.appendChild(styleEl);

  // 3. Setup Voice Prompts Database
  const prompts = {
    EN: {
      welcome: "Welcome to Lead Flow AI. Let us connect you with our agent in ninety seconds.",
      name: "Please enter your full name.",
      phone: "Please enter your active phone number starting with your country code.",
      email: "Enter your email address to receive details.",
      requirement: "Tell us a bit about your requirement or project.",
      consent: "Authorize us to call you instantly by checking the box.",
      submitting: "Connecting to our AI qualifier queue.",
      success: "Successfully queued! Dialing your phone number. Answer to connect instantly.",
      error: "Oops, something went wrong. Please check your inputs."
    },
    HI: {
      welcome: "लीड फ्लो ए आई में आपका स्वागत है। आइए हम आपको हमारे एजेंट से नब्बे सेकंड में जोड़ें।",
      name: "कृपया अपना पूरा नाम दर्ज करें।",
      phone: "कृपया देश के कोड के साथ अपना सक्रिय फ़ोन नंबर दर्ज करें।",
      email: "विवरण प्राप्त करने के लिए अपना ईमेल पता दर्ज करें।",
      requirement: "हमें अपनी आवश्यकता या प्रोजेक्ट के बारे में थोड़ा बताएं।",
      consent: "बॉक्स को चेक करके हमें आपको तुरंत कॉल करने के लिए अधिकृत करें।",
      submitting: "ए आई कॉलर कतार से जुड़ रहा है।",
      success: "सफलतापूर्वक दर्ज किया गया! आपके फ़ोन नंबर पर कॉल आ रही है। तुरंत जुड़ने के लिए उत्तर दें।",
      error: "ओह, कुछ गलत हो गया। कृपया अपनी प्रविष्टि की जाँच करें।"
    }
  };

  let voiceGuidanceEnabled = true;
  let currentLanguage = 'EN';
  let speechSynth = window.speechSynthesis;

  function speak(text) {
    if (!voiceGuidanceEnabled || !speechSynth) return;
    speechSynth.cancel(); // stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    // Find appropriate voice
    const voices = speechSynth.getVoices();
    if (currentLanguage === 'HI') {
      const hiVoice = voices.find(v => v.lang.startsWith('hi'));
      if (hiVoice) utterance.voice = hiVoice;
      utterance.lang = 'hi-IN';
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = 'en-US';
    }
    utterance.rate = 0.95; // slightly slower for clarity
    speechSynth.speak(utterance);
  }

  // 4. Render markup
  const container = document.createElement('div');
  container.id = 'lf-widget-container';
  container.innerHTML = `
    <div id="lf-card">
      <div class="lf-header">
        <div class="lf-header-top">
          <div class="lf-brand">
            <div class="lf-logo">LF</div>
            <span class="lf-brand-text">LeadFlow-AI</span>
          </div>
          <div class="lf-audio-controls">
            <button class="lf-audio-btn active" id="lf-audio-toggle" title="Toggle Voice Guidance">
              <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </button>
            <select class="lf-lang-select" id="lf-lang-select">
              <option value="EN">EN</option>
              <option value="HI">हिन्दी</option>
            </select>
          </div>
        </div>
        <div class="lf-subtitle">Get a 90-second AI phone consultation now. Simply fill out the details below.</div>
      </div>
      <div class="lf-content" id="lf-form-content">
        <form id="lf-capture-form" style="display: block;">
          <div class="lf-form-group">
            <label class="lf-label" for="lf-name">Full Name *</label>
            <input type="text" id="lf-name" class="lf-input" placeholder="e.g. Rahul Sharma" required />
          </div>
          <div class="lf-form-group">
            <label class="lf-label" for="lf-phone">Phone Number *</label>
            <input type="tel" id="lf-phone" class="lf-input" placeholder="e.g. +919876543210" required />
          </div>
          <div class="lf-form-group">
            <label class="lf-label" for="lf-email">Email Address</label>
            <input type="email" id="lf-email" class="lf-input" placeholder="e.g. rahul@gmail.com" />
          </div>
          <div class="lf-form-group">
            <label class="lf-label" for="lf-requirement">Requirement / Project Notes</label>
            <textarea id="lf-requirement" class="lf-input" rows="3" placeholder="Describe what you are looking for..." style="resize: none;"></textarea>
          </div>
          <div class="lf-consent-container">
            <input type="checkbox" id="lf-consent" class="lf-checkbox" checked required />
            <label for="lf-consent" class="lf-consent-text">
              I agree to receive a <strong>90-second AI phone call</strong> from LeadFlow CRM team to qualify my inquiry.
            </label>
          </div>
          <button type="submit" class="lf-submit-btn" id="lf-submit-btn">
            <span>Start 90s Call Session</span>
            <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>
      <div class="lf-success-screen" id="lf-success-screen">
        <div class="lf-success-icon">✓</div>
        <div class="lf-success-title" id="lf-success-title">Calling You Now!</div>
        <div class="lf-success-desc" id="lf-success-desc">We are dialing your phone number. Your speed-to-lead verification has begun.</div>
        <div class="lf-countdown" id="lf-timer">90s</div>
        <div class="lf-subtitle">Keep your phone ready.</div>
      </div>
      <div class="lf-footer">
        Secured by <a href="https://leadflowai.com" target="_blank">LeadFlow-AI</a>
      </div>
    </div>
    <div id="lf-launcher">
      <svg id="lf-launcher-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>
  `;

  document.body.appendChild(container);

  const launcher = document.getElementById('lf-launcher');
  const card = document.getElementById('lf-card');
  const form = document.getElementById('lf-capture-form');
  const submitBtn = document.getElementById('lf-submit-btn');
  const successScreen = document.getElementById('lf-success-screen');
  const formContent = document.getElementById('lf-form-content');
  const audioToggle = document.getElementById('lf-audio-toggle');
  const langSelect = document.getElementById('lf-lang-select');

  // Input elements for voice hooks
  const fields = [
    { id: 'lf-name', promptKey: 'name' },
    { id: 'lf-phone', promptKey: 'phone' },
    { id: 'lf-email', promptKey: 'email' },
    { id: 'lf-requirement', promptKey: 'requirement' },
    { id: 'lf-consent', promptKey: 'consent' }
  ];

  // 5. Wire Events
  launcher.addEventListener('click', () => {
    const isOpen = card.classList.toggle('open');
    launcher.classList.toggle('active');
    if (isOpen) {
      speak(prompts[currentLanguage].welcome);
    }
  });

  audioToggle.addEventListener('click', () => {
    voiceGuidanceEnabled = !voiceGuidanceEnabled;
    audioToggle.classList.toggle('active', voiceGuidanceEnabled);
    if (!voiceGuidanceEnabled && speechSynth) {
      speechSynth.cancel();
    } else {
      speak(prompts[currentLanguage].welcome);
    }
  });

  langSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    speak(prompts[currentLanguage].welcome);
  });

  // Attach focus listeners for voice guidance
  fields.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) {
      el.addEventListener('focus', () => {
        speak(prompts[currentLanguage][field.promptKey]);
      });
    }
  });

  // Load voices when available (Web Speech API async load)
  if (speechSynth && speechSynth.onvoiceschanged !== undefined) {
    speechSynth.onvoiceschanged = () => {
      // Just loaded voices inside browser
    };
  }

  // 6. Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('lf-name').value.trim();
    const phone = document.getElementById('lf-phone').value.trim();
    const email = document.getElementById('lf-email').value.trim();
    const requirement = document.getElementById('lf-requirement').value.trim();
    const consentGiven = document.getElementById('lf-consent').checked;

    if (!name || !phone || !consentGiven) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="lf-spinner"></span> <span>${currentLanguage === 'HI' ? 'जुड़ रहा है...' : 'Queueing...'}</span>`;
    speak(prompts[currentLanguage].submitting);

    try {
      const response = await fetch(`${apiHost}/api/v1/capture/${orgToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone, email, requirement, consentGiven }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Play success audio
        speak(prompts[currentLanguage].success);

        // Transition screens
        form.style.display = 'none';
        formContent.style.display = 'none';
        successScreen.style.display = 'flex';

        // Setup Countdown
        let timeLeft = 90;
        const timerEl = document.getElementById('lf-timer');
        const countdownInterval = setInterval(() => {
          timeLeft--;
          if (timerEl) timerEl.innerText = `${timeLeft}s`;
          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            if (timerEl) timerEl.innerText = 'Call Dialed';
          }
        }, 1000);

        if (currentLanguage === 'HI') {
          document.getElementById('lf-success-title').innerText = 'कॉल मिलाई जा रही है!';
          document.getElementById('lf-success-desc').innerText = 'हम आपका नंबर डायल कर रहे हैं। अपनी कॉल का जवाब देने के लिए तैयार रहें।';
        }
      } else {
        throw new Error(result.message || 'Capture failed');
      }
    } catch (err) {
      console.error(err);
      speak(prompts[currentLanguage].error);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Start 90s Call Session</span>
        <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      `;
      alert(currentLanguage === 'HI' ? 'कॉल आरंभ करने में त्रुटि हुई। कृपया पुनः प्रयास करें।' : 'Failed to connect. Please try again.');
    }
  });
})();
