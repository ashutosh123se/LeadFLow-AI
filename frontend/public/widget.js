(function () {
  // Styles for the embedded speed-to-lead widget
  const css = `
    .llf-widget-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-center: center;
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .llf-widget-launcher:hover {
      transform: scale(1.05) rotate(5deg);
    }
    .llf-widget-launcher svg {
      width: 26px;
      height: 26px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .llf-widget-box {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
      z-index: 999999;
      display: none;
      flex-direction: col;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .llf-widget-header {
      background: linear-gradient(135deg, #6366f1/10 0%, #a855f7/10 100%);
      padding: 20px;
      border-bottom: 1px solid #1e293b;
    }
    .llf-widget-title {
      font-size: 16px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
    }
    .llf-widget-desc {
      font-size: 11px;
      color: #94a3b8;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }
    .llf-widget-form {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .llf-widget-form label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }
    .llf-widget-form input, .llf-widget-form textarea {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 10px 12px;
      color: #f8fafc;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }
    .llf-widget-form input:focus, .llf-widget-form textarea:focus {
      border-color: #6366f1;
    }
    .llf-widget-consent {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 4px;
    }
    .llf-widget-consent input[type="checkbox"] {
      width: auto;
      margin: 2px 0 0 0;
      cursor: pointer;
    }
    .llf-widget-consent span {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    .llf-widget-submit {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 12px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      transition: opacity 0.2s;
    }
    .llf-widget-submit:hover {
      opacity: 0.95;
    }
    .llf-widget-success {
      padding: 30px 20px;
      text-align: center;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .llf-widget-success-icon {
      width: 48px;
      height: 48px;
      border-radius: 24px;
      background: rgba(16, 185, 129, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #10b981;
    }
    .llf-widget-success-title {
      font-size: 16px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
    }
    .llf-widget-success-desc {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }
  `;

  // Inject stylesheet
  const styleEl = document.createElement('style');
  styleEl.innerHTML = css;
  document.head.appendChild(styleEl);

  // Read configuration from script tag
  const scriptEl = document.currentScript;
  const orgToken = scriptEl ? scriptEl.getAttribute('data-org-token') : null;
  const apiUrl = scriptEl ? (scriptEl.getAttribute('data-api-url') || 'https://api.leadflowai.com/api/v1') : 'https://api.leadflowai.com/api/v1';

  if (!orgToken) {
    console.error('LeadLFlowAI Widget: data-org-token attribute is required.');
    return;
  }

  // Create launcher icon button
  const launcher = document.createElement('div');
  launcher.className = 'llf-widget-launcher';
  launcher.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  `;
  document.body.appendChild(launcher);

  // Create widget container
  const box = document.createElement('div');
  box.className = 'llf-widget-box';
  box.innerHTML = `
    <div class="llf-widget-header">
      <h4 class="llf-widget-title">Get a Call in 90 Seconds!</h4>
      <p class="llf-widget-desc">Speak to our natural AI voice agent now to resolve your queries instantly.</p>
    </div>
    <form class="llf-widget-form" id="llfForm">
      <div>
        <label>Your Name</label>
        <input type="text" id="llfName" placeholder="e.g. Akash Gupta" required />
      </div>
      <div>
        <label>Your Mobile Number</label>
        <input type="tel" id="llfPhone" placeholder="e.g. 9876543210" pattern="[6-9]\\d{9}" required />
      </div>
      <div>
        <label>Specific Inquiry / Requirement</label>
        <textarea id="llfReq" placeholder="e.g. Looking for pricing plans details." rows="2"></textarea>
      </div>
      <div class="llf-widget-consent">
        <input type="checkbox" id="llfConsent" checked required />
        <span>I consent to receive an automated outbound qualification call from this business.</span>
      </div>
      <button type="submit" class="llf-widget-submit" id="llfSubmit">Call Me Now</button>
    </form>
    <div class="llf-widget-success" id="llfSuccess">
      <div class="llf-widget-success-icon">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h4 class="llf-widget-success-title">Call Scheduled!</h4>
      <p class="llf-widget-success-desc">Hold your phone! Our AI speed dialer is calling you in 90 seconds.</p>
    </div>
  `;
  document.body.appendChild(box);

  // Toggling Widget Drawer
  launcher.addEventListener('click', function () {
    if (box.style.display === 'none' || box.style.display === '') {
      box.style.display = 'flex';
      launcher.style.transform = 'scale(0.9) rotate(-45deg)';
    } else {
      box.style.display = 'none';
      launcher.style.transform = 'none';
    }
  });

  // Submit Handler
  const form = document.getElementById('llfForm');
  const successDiv = document.getElementById('llfSuccess');
  const submitBtn = document.getElementById('llfSubmit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('llfName').value;
    const phone = document.getElementById('llfPhone').value;
    const requirement = document.getElementById('llfReq').value;
    const consent = document.getElementById('llfConsent').checked;

    submitBtn.innerText = 'Triggering Call...';
    submitBtn.disabled = true;

    // Call public capture API endpoint
    fetch(`${apiUrl}/capture/${orgToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        requirement: requirement,
        consentGiven: consent
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Capture failed');
        return res.json();
      })
      .then(function (data) {
        form.style.display = 'none';
        successDiv.style.display = 'flex';
      })
      .catch(function (err) {
        alert('Call trigger failed. Please check phone format and try again.');
        submitBtn.innerText = 'Call Me Now';
        submitBtn.disabled = false;
      });
  });
})();
