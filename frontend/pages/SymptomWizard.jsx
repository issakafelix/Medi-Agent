import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sendMessage, streamMessage, rateMessage, getConversations, getConversation, geocodeLocation, findNearbyHospitals } from '../services/apiService';
import { formatReply } from '../utils/formatReply';
import { useDarkMode } from '../hooks/useCustomHooks';
import FirebaseAuth from '../components/FirebaseAuth';
import '../styles/symptomWizard.css';

const EXAMPLES = [
  { key: 'headache', label: 'Headache + light sensitivity', text: "I've had a throbbing headache since this morning, some sensitivity to light, and mild nausea." },
  { key: 'allergy', label: 'Swelling after a bee sting', text: "I got stung by a bee about an hour ago and the area is red, swollen, and itchy." },
  { key: 'fever', label: 'High fever with body aches', text: "I've had a high fever since last night along with body aches and chills." },
];

const STEPS = [
  { n: 1, label: 'Symptoms' },
  { n: 2, label: 'Assessment' },
  { n: 3, label: 'First aid' },
  { n: 4, label: 'Care nearby' },
];

// Emergency "red flag" patterns checked instantly, before any AI call.
// Deliberately broad: a false alarm costs a dismissed banner; a miss costs far more.
const RED_FLAGS = [
  { re: /chest (pain|pressure|tightness)|pain in (my |the )?chest/i, label: 'chest pain' },
  { re: /(can'?t|cannot|can not|hard to|difficulty|trouble|struggling to) breath|short(ness)? of breath|gasping/i, label: 'breathing difficulty' },
  { re: /stroke|face droop|slurred speech|(one side|left side|right side).{0,20}(weak|numb)|sudden (numbness|confusion)/i, label: 'possible stroke signs' },
  { re: /(heavy|severe|uncontrolled) bleed|bleeding (a lot|heavily)|(won'?t|will not) stop bleed/i, label: 'severe bleeding' },
  { re: /unconscious|unresponsive|passed out|fainted|not waking/i, label: 'loss of consciousness' },
  { re: /seizure|convulsion/i, label: 'seizure' },
  { re: /suicid|kill myself|end my life|self[- ]?harm/i, label: 'mental health crisis' },
  { re: /anaphyla|throat (is )?(swelling|closing)|severe allergic/i, label: 'severe allergic reaction' },
  { re: /(lips|face) (are |is )?(turning )?blue|turning blue/i, label: 'bluish lips/face' },
  { re: /poison|overdose|swallowed (chemical|bleach|detergent)/i, label: 'poisoning/overdose' },
  { re: /(coughing|vomiting|throwing) up blood|blood in (my )?(vomit|stool|urine)|coughing blood/i, label: 'internal bleeding signs' },
  { re: /worst headache of my life|thunderclap headache/i, label: 'sudden severe headache' },
  { re: /snake ?bite|scorpion sting/i, label: 'venomous bite/sting' },
];

function checkRedFlags(text) {
  const found = [];
  for (const { re, label } of RED_FLAGS) {
    if (re.test(text) && !found.includes(label)) found.push(label);
  }
  return found;
}

const ArrowIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}><path d="M5 12h14M13 5l7 7-7 7" /></svg>
);

const WarningIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M12 9v4M12 17h.01M10.3 3.9L2.8 17a1.7 1.7 0 0 0 1.5 2.5h15.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a1.7 1.7 0 0 0-3 0Z" /></svg>
);

const ClockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

const SunIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);

const MoonIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
);

export default function SymptomWizard({ onOpenAuth }) {
  const [isDarkMode, setIsDarkMode] = useDarkMode();
  const [step, setStep] = useState(1);
  const [symptomText, setSymptomText] = useState('');
  const [location, setLocation] = useState('');
  const [symptomInvalid, setSymptomInvalid] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [assessment, setAssessment] = useState('');
  const [aid, setAid] = useState('');
  const [care, setCare] = useState('');
  const [loadingStage, setLoadingStage] = useState(null); // 'analyze' | 'aid' | 'care' | null
  const [error, setError] = useState('');
  const [redFlags, setRedFlags] = useState([]);
  const [assessmentMsgId, setAssessmentMsgId] = useState(null);
  const [assessmentRating, setAssessmentRating] = useState(0);

  // History panel
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySignedIn, setHistorySignedIn] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('idle'); // idle | loading | done | error
  const [historyList, setHistoryList] = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null);

  // Hospital locator (OpenStreetMap — no API key). Independent of `error`/
  // `loadingStage` above since it can fail (or take longer) separately from
  // the AI guidance call that gates step advancement.
  const [hospitals, setHospitals] = useState([]);
  const [hospitalStatus, setHospitalStatus] = useState('idle'); // idle | locating | searching | done | error
  const [hospitalMessage, setHospitalMessage] = useState('');
  const [userCoords, setUserCoords] = useState(null);

  const rootRef = useRef(null);
  const stickyTopRef = useRef(null);
  const symptomInputRef = useRef(null);
  const errorBannerRef = useRef(null);
  const step2Ref = useRef(null);
  const step3Ref = useRef(null);
  const step4Ref = useRef(null);
  const sectionRefs = { 2: step2Ref, 3: step3Ref, 4: step4Ref };
  const isFirstRender = useRef(true);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Mark the sticky bar as soon as content slides beneath it (`is-scrolled`
  // drives the hairline/shadow/compression in CSS) and feed the progress
  // line via a CSS var — direct DOM writes per frame, no React re-render.
  useEffect(() => {
    const root = rootRef.current;
    const sticky = stickyTopRef.current;
    if (!root || !sticky) return;

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sticky.classList.toggle('is-scrolled', root.scrollTop > 8);
        const max = root.scrollHeight - root.clientHeight;
        sticky.style.setProperty('--scroll-progress', max > 0 ? String(root.scrollTop / max) : '0');
      });
    }

    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Escape dismisses the error banner from anywhere.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setError('');
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Scroll to + focus the newly active step (skip on first render).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const el = sectionRefs[step]?.current;
    if (!el) return;
    const t1 = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => el.focus({ preventScroll: true }), 350);
    }, 80);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (error) errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [error]);

  // Render/update the Leaflet map once we have a resolved location + results.
  // Marker popups are built as DOM nodes (not HTML strings) so hospital
  // names/addresses from OpenStreetMap — public, editable data — can never
  // be interpreted as markup.
  useEffect(() => {
    if (hospitalStatus !== 'done' || !userCoords || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    const userIcon = L.divIcon({ className: 'symptom-wizard-user-pin', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8] });
    L.marker([userCoords.lat, userCoords.lon], { icon: userIcon }).addTo(layer).bindPopup('Your location');

    const hospIcon = L.divIcon({ className: 'symptom-wizard-hosp-pin', html: '<span></span>', iconSize: [14, 14], iconAnchor: [7, 7] });
    const bounds = L.latLngBounds([[userCoords.lat, userCoords.lon]]);

    hospitals.forEach((h) => {
      const popupEl = document.createElement('div');
      const nameEl = document.createElement('strong');
      nameEl.textContent = h.name;
      const distEl = document.createElement('div');
      distEl.textContent = `${h.distance_km} km away`;
      popupEl.appendChild(nameEl);
      popupEl.appendChild(distEl);

      L.marker([h.lat, h.lon], { icon: hospIcon }).addTo(layer).bindPopup(popupEl);
      bounds.extend([h.lat, h.lon]);
    });

    map.invalidateSize();
    if (hospitals.length > 0) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    } else {
      map.setView([userCoords.lat, userCoords.lon], 13);
    }
  }, [hospitals, userCoords, hospitalStatus]);

  // Tear the map down on unmount so Leaflet's DOM/listeners don't leak.
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Streaming variant: onText receives the growing reply so the UI can render
  // it word-by-word. Falls back to the non-streaming endpoint on failure.
  async function callChatStream(message, onText) {
    try {
      const res = await streamMessage(
        message,
        { conversationId: conversationId ?? undefined, preset: 'default' },
        {
          onDelta: (full) => onText?.(full),
          onMeta: (m) => { if (m?.conversation_id) setConversationId(m.conversation_id); },
        }
      );
      if (res.conversation_id) setConversationId(res.conversation_id);
      return res;
    } catch (streamErr) {
      console.warn('Stream failed, falling back to regular request:', streamErr?.message);
      const res = await sendMessage(message, {
        conversationId: conversationId ?? undefined,
        preset: 'default',
      });
      setConversationId(res.conversation_id);
      onText?.(res.reply);
      return { reply: res.reply, conversation_id: res.conversation_id, bot_message_id: res.bot_message_id };
    }
  }

  async function handleAnalyze() {
    const text = symptomText.trim();
    if (!text) {
      setSymptomInvalid(true);
      symptomInputRef.current?.focus();
      return;
    }
    setSymptomInvalid(false);
    setError('');
    // Safety first: scan for emergency keywords immediately, before the AI runs.
    setRedFlags(checkRedFlags(text));
    setLoadingStage('analyze');
    setAssessment('');
    setAssessmentMsgId(null);
    setAssessmentRating(0);
    try {
      const res = await callChatStream(text, (partial) => {
        setAssessment(partial);
        setStep((s) => Math.max(s, 2));
      });
      setAssessment(res.reply);
      setAssessmentMsgId(res.bot_message_id ?? null);
      setStep((s) => Math.max(s, 2));
    } catch (err) {
      setError(err?.message || 'Could not reach MediAgent. Please try again.');
    } finally {
      setLoadingStage(null);
    }
  }

  function openHistory() {
    setHistoryOpen(true);
    setHistoryDetail(null);
    // Only signed-in users get personal history; guests share one anonymous
    // identity server-side, so showing "their" history would leak others'.
    let signed = false;
    try { signed = !!window.localStorage.getItem('FIREBASE_ID_TOKEN'); } catch (e) { /* private mode */ }
    setHistorySignedIn(signed);
    if (!signed) return;
    setHistoryStatus('loading');
    getConversations(50)
      .then((res) => { setHistoryList(res.conversations || []); setHistoryStatus('done'); })
      .catch(() => setHistoryStatus('error'));
  }

  async function openHistoryConversation(id) {
    setHistoryStatus('loading');
    try {
      const detail = await getConversation(id);
      setHistoryDetail(detail);
      setHistoryStatus('done');
    } catch (e) {
      setHistoryStatus('error');
    }
  }

  async function handleRateAssessment(value) {
    if (!assessmentMsgId) return;
    const next = assessmentRating === value ? 0 : value;
    setAssessmentRating(next);
    try {
      await rateMessage(assessmentMsgId, next);
    } catch (e) {
      // Rating is non-critical; ignore failures silently.
    }
  }

  async function handleFirstAid() {
    setError('');
    setLoadingStage('aid');
    setAid('');
    try {
      const res = await callChatStream(
        "Based on what I just described, give me clear, step-by-step first aid or home-care guidance I can follow right now. Keep it as a short numbered list.",
        (partial) => {
          setAid(partial);
          setStep((s) => Math.max(s, 3));
        }
      );
      setAid(res.reply);
      setStep((s) => Math.max(s, 3));
    } catch (err) {
      setError(err?.message || 'Could not reach MediAgent. Please try again.');
    } finally {
      setLoadingStage(null);
    }
  }

  function getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }

  async function loadNearbyHospitals(typedLocation) {
    setHospitalStatus('locating');
    setHospitalMessage('');
    setHospitals([]);
    setUserCoords(null);

    let coords;
    try {
      coords = await getBrowserLocation();
    } catch (geoErr) {
      if (!typedLocation) {
        setHospitalStatus('error');
        setHospitalMessage('Location access was denied. Add a city/area above and click "Find nearest care" again to see nearby hospitals.');
        return;
      }
      try {
        const geo = await geocodeLocation(typedLocation);
        coords = { lat: geo.lat, lon: geo.lon };
      } catch (geocodeErr) {
        setHospitalStatus('error');
        setHospitalMessage(geocodeErr?.message || `Couldn't find "${typedLocation}". Try a more specific city or area.`);
        return;
      }
    }

    setUserCoords(coords);
    setHospitalStatus('searching');
    try {
      const res = await findNearbyHospitals(coords.lat, coords.lon);
      const found = res.hospitals || [];
      setHospitals(found);
      setHospitalStatus('done');
      setHospitalMessage(found.length ? '' : 'No hospitals or clinics found within 5km of this location.');
    } catch (err) {
      setHospitalStatus('error');
      setHospitalMessage(err?.message || 'Could not look up nearby hospitals.');
    }
  }

  async function handleFindCare() {
    setError('');
    setLoadingStage('care');
    const loc = location.trim();
    const message = loc
      ? `My location is ${loc}. Based on what I described, what hospitals, clinics, or type of specialist should I look for nearby, and what should I ask for when I arrive?`
      : "Based on what I described, what type of hospital, clinic, or specialist should I look for, and what should I ask for when I arrive? I haven't shared my exact location.";

    setCare('');
    const [aiResult] = await Promise.allSettled([
      callChatStream(message, (partial) => {
        setCare(partial);
        setStep((s) => Math.max(s, 4));
      }),
      loadNearbyHospitals(loc),
    ]);

    if (aiResult.status === 'fulfilled') {
      setCare(aiResult.value.reply);
      setStep((s) => Math.max(s, 4));
    } else {
      setError(aiResult.reason?.message || 'Could not reach MediAgent. Please try again.');
    }
    setLoadingStage(null);
  }

  function handleSymptomKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  }

  function handleLocationKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  }

  function pickExample(text) {
    setSymptomText(text);
    setSymptomInvalid(false);
    symptomInputRef.current?.focus();
  }

  function handleChipKeyDown(e, text) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pickExample(text);
    }
  }

  // Logo click = fresh start. The ECG line redraws once as feedback, then
  // the page reloads; under reduced motion the reload is immediate.
  function handleBrandRefresh(e) {
    const btn = e.currentTarget;
    if (btn.classList.contains('is-refreshing')) return;
    btn.classList.add('is-refreshing');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => window.location.reload(), reduced ? 0 : 500);
  }

  return (
    <div className="symptom-wizard">
      {historyOpen && (
        <div className="history-overlay" onClick={() => setHistoryOpen(false)}>
          <aside className="history-panel" role="dialog" aria-label="Chat history" onClick={(e) => e.stopPropagation()}>
            <div className="history-head">
              {historyDetail ? (
                <button type="button" className="history-nav" onClick={() => setHistoryDetail(null)}>← All sessions</button>
              ) : (
                <div className="history-title">Your past sessions</div>
              )}
              <button type="button" className="history-nav" onClick={() => setHistoryOpen(false)} aria-label="Close history">✕</button>
            </div>

            {!historySignedIn && (
              <div className="history-empty">
                Sign in (top right) to keep your sessions — your history will appear here on any device.
              </div>
            )}

            {historySignedIn && historyStatus === 'loading' && (
              <div className="history-empty">Loading…</div>
            )}

            {historySignedIn && historyStatus === 'error' && (
              <div className="history-empty">Couldn&rsquo;t load history. Close and try again.</div>
            )}

            {historySignedIn && historyStatus === 'done' && !historyDetail && (
              historyList.length === 0 ? (
                <div className="history-empty">No saved sessions yet — run a symptom check and it will appear here.</div>
              ) : (
                <div className="history-list">
                  {historyList.map((c) => (
                    <button
                      key={c.conversation_id}
                      type="button"
                      className="history-item"
                      onClick={() => openHistoryConversation(c.conversation_id)}
                    >
                      <span className="history-item-title">{c.title}</span>
                      <span className="history-item-date">{new Date(c.updated_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )
            )}

            {historySignedIn && historyStatus === 'done' && historyDetail && (
              <div className="history-messages">
                {historyDetail.messages.map((m) => (
                  <div key={m.message_id} className={`history-msg${m.role === 'bot' ? ' bot' : ''}`}>
                    <div className="history-msg-role">{m.role === 'bot' ? 'MediAgent' : 'You'}</div>
                    <div className="history-msg-content">{formatReply(m.content)}</div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="sticky-top" ref={stickyTopRef}>
        <header>
          <div className="header-inner">
            <button
              type="button"
              className="brand"
              onClick={handleBrandRefresh}
              title="Refresh MediAgent"
              aria-label="Refresh MediAgent and start over"
            >
              <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2 12h4l2-7 4 14 2-9 2 5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <div className="brand-name">MediAgent</div>
                <div className="brand-tag">Symptoms → first aid → nearest care</div>
              </div>
            </button>
            <div className="header-actions">
              <div className="disclaimer-pill">
                <WarningIcon />
                Informational only, not a diagnosis
              </div>
              <button
                type="button"
                className="history-btn theme-btn"
                onClick={() => setIsDarkMode(!isDarkMode)}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDarkMode ? 'Light mode' : 'Dark mode'}
              >
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
              </button>
              <button type="button" className="history-btn" onClick={openHistory} aria-label="View chat history">
                <ClockIcon />
                <span>History</span>
              </button>
              <FirebaseAuth onOpenAuth={onOpenAuth} />
            </div>
          </div>
        </header>

        <div className="journey">
          <div className="journey-track">
            {STEPS.map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <div className={`j-step${step === n ? ' active' : ''}${step > n ? ' done' : ''}`}>
                  <div className="j-node">{n}</div>
                  <div className="j-label">{label}</div>
                </div>
                {i < STEPS.length - 1 && <div className="j-connector" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <span className="scroll-progress" aria-hidden="true" />
      </div>

      {/* Scrolling lives here (not on the wizard root) so the scrollbar
          starts below the header instead of running across it. */}
      <div className="scroll-region" ref={rootRef}>
      <div className="wrap">
        {redFlags.length > 0 && (
          <div className="emergency-banner" role="alert">
            <div className="emergency-title">
              <WarningIcon />
              <span>Possible emergency: {redFlags.join(', ')}</span>
            </div>
            <p>
              If this is happening right now, don&rsquo;t wait for the AI — call emergency
              services or get to the nearest emergency room immediately.
            </p>
            <a className="emergency-call" href="tel:112">Call 112 now</a>
            <span className="emergency-note">
              112 is the emergency number in Ghana and many countries — use your local number if different.
            </span>
          </div>
        )}

        {error && (
          <div className="error-banner" ref={errorBannerRef} role="alert">
            <WarningIcon />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: SYMPTOM INPUT */}
        <section>
          <div className="eyebrow">Step 1 · Tell us what&rsquo;s going on</div>
          <h1 className="hero-title">Describe your symptoms<br /><em>in your own words.</em></h1>
          <p className="hero-sub">MediAgent reads your description the way a first responder would — then narrows it to the most likely conditions, what to do right now, and where to go next.</p>

          <div className="card">
            <textarea
              ref={symptomInputRef}
              value={symptomText}
              onChange={(e) => { setSymptomText(e.target.value); if (symptomInvalid) setSymptomInvalid(false); }}
              onKeyDown={handleSymptomKeyDown}
              placeholder="e.g. I've had a throbbing headache since this morning, some sensitivity to light, and mild nausea…"
              style={symptomInvalid ? { boxShadow: 'inset 0 -2px 0 var(--coral)' } : undefined}
            />
            <div className="example-row">
              {EXAMPLES.map(({ key, label, text }) => (
                <div
                  key={key}
                  className="example-chip"
                  tabIndex={0}
                  role="button"
                  onClick={() => pickExample(text)}
                  onKeyDown={(e) => handleChipKeyDown(e, text)}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="card-footer">
              <div className="location-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
                <input
                  type="text"
                  className="location-input"
                  placeholder="City / area (optional) — helps tailor care advice"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={handleLocationKeyDown}
                />
              </div>
              <button
                className={`analyze-btn${loadingStage === 'analyze' ? ' loading' : ''}`}
                onClick={handleAnalyze}
                disabled={loadingStage === 'analyze'}
              >
                <span>{loadingStage === 'analyze' ? 'Analyzing…' : 'Analyze symptoms'}</span>
                <ArrowIcon />
              </button>
            </div>
          </div>
        </section>

        {/* STEP 2: ASSESSMENT */}
        {step >= 2 && (
          <section ref={step2Ref} tabIndex={-1} className="reveal-block">
            <div className="eyebrow">Step 2 · AI assessment</div>
            <div className="card">
              <div className="section-title">MediAgent&rsquo;s assessment</div>
              <div className="section-desc">Based on what you described. Not a diagnosis — a starting point.</div>
              <div className="reply-text">{formatReply(assessment)}</div>
              {assessmentMsgId != null && loadingStage !== 'analyze' && (
                <div className="rate-row">
                  <span>Was this helpful?</span>
                  <button
                    type="button"
                    className={`rate-btn${assessmentRating === 1 ? ' active' : ''}`}
                    onClick={() => handleRateAssessment(1)}
                    aria-label="Helpful"
                    aria-pressed={assessmentRating === 1}
                  >👍</button>
                  <button
                    type="button"
                    className={`rate-btn${assessmentRating === -1 ? ' active' : ''}`}
                    onClick={() => handleRateAssessment(-1)}
                    aria-label="Not helpful"
                    aria-pressed={assessmentRating === -1}
                  >👎</button>
                </div>
              )}
              <button className="advance-btn" onClick={handleFirstAid} disabled={loadingStage === 'aid'}>
                <span>{loadingStage === 'aid' ? 'Loading…' : 'View first aid guidance'}</span>
                <ArrowIcon />
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: FIRST AID */}
        {step >= 3 && (
          <section ref={step3Ref} tabIndex={-1} className="reveal-block">
            <div className="eyebrow">Step 3 · What to do right now</div>
            <div className="card aid-card">
              <div className="section-title">First aid guidance</div>
              <div className="section-desc">Structured for a non-medical responder. Follow in order.</div>
              <div className="reply-text">{formatReply(aid)}</div>
              <button className="advance-btn aid-advance" onClick={handleFindCare} disabled={loadingStage === 'care'}>
                <span>{loadingStage === 'care' ? 'Finding care…' : 'Find nearest care'}</span>
                <ArrowIcon />
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: CARE GUIDANCE */}
        {step >= 4 && (
          <section ref={step4Ref} tabIndex={-1} className="reveal-block">
            <div className="eyebrow">Step 4 · Nearest appropriate care</div>
            <div className="card">
              <div className="section-title">What to look for</div>
              <div className="section-desc">AI-generated guidance based on your symptoms and location.</div>
              <div className="reply-text">{formatReply(care)}</div>
            </div>

            <div className="card">
              <div className="section-title">Hospitals &amp; clinics near you</div>
              <div className="section-desc">Real facilities from OpenStreetMap, sorted by distance.</div>

              {(hospitalStatus === 'locating' || hospitalStatus === 'searching') && (
                <div className="hospital-status">
                  <span className="hospital-status-spinner" aria-hidden="true" />
                  {hospitalStatus === 'locating' ? 'Finding your location…' : 'Looking for nearby hospitals & clinics…'}
                </div>
              )}

              {hospitalStatus === 'error' && (
                <div className="hospital-status hospital-status-error">
                  <WarningIcon />
                  <span>{hospitalMessage}</span>
                  <button type="button" className="hospital-retry" onClick={() => loadNearbyHospitals(location.trim())}>
                    Try again
                  </button>
                </div>
              )}

              {hospitalStatus === 'done' && userCoords && (
                <div
                  className="hospital-map"
                  ref={mapContainerRef}
                  role="img"
                  aria-label="Map showing your location and nearby hospitals"
                />
              )}

              {hospitalStatus === 'done' && hospitals.length === 0 && (
                <div className="hospital-status">{hospitalMessage}</div>
              )}

              {hospitals.length > 0 && (
                <div className="hospital-list">
                  {hospitals.map((h) => (
                    <div className="hospital" key={h.id}>
                      <div className="hospital-pin">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
                      </div>
                      <div className="hospital-body">
                        <div className="hospital-top">
                          <div className="hospital-name">{h.name}</div>
                          <div className="hospital-dist">{h.distance_km} km</div>
                        </div>
                        <div className="hospital-meta">
                          {h.kind === 'clinic' ? 'Clinic' : 'Hospital'}{h.address ? ` · ${h.address}` : ''}
                        </div>
                        <div className="hospital-actions">
                          <a
                            className="hosp-btn primary"
                            href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Get directions
                          </a>
                          {h.phone && <a className="hosp-btn" href={`tel:${h.phone}`}>{h.phone}</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-title">Take this to your visit</div>
              <div className="section-desc">Print or save a one-page summary of this session to show a doctor or pharmacist.</div>
              <button type="button" className="advance-btn" onClick={() => window.print()}>
                <span>Print / save summary</span>
              </button>
            </div>
          </section>
        )}

        {/* Print-only summary (hidden on screen, shown via @media print) */}
        {assessment && (
          <div className="doctor-summary">
            <h1>MediAgent — Symptom session summary</h1>
            <p className="ds-meta">
              Generated {new Date().toLocaleString()} · AI-assisted triage · NOT a medical diagnosis
            </p>
            <h2>Symptoms as described by the patient</h2>
            <p>{symptomText}</p>
            {location.trim() && (
              <>
                <h2>Reported location</h2>
                <p>{location}</p>
              </>
            )}
            <h2>AI assessment</h2>
            <div>{formatReply(assessment)}</div>
            {aid && (
              <>
                <h2>First aid guidance given</h2>
                <div>{formatReply(aid)}</div>
              </>
            )}
            {care && (
              <>
                <h2>Care guidance</h2>
                <div>{formatReply(care)}</div>
              </>
            )}
            {hospitals.length > 0 && (
              <>
                <h2>Nearby facilities found</h2>
                <ul>
                  {hospitals.slice(0, 5).map((h) => (
                    <li key={h.id}>
                      {h.name} — {h.distance_km} km{h.phone ? ` — ${h.phone}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="ds-foot">
              Generated by MediAgent (research prototype). All information should be verified by a qualified clinician.
            </p>
          </div>
        )}

        <footer>MediAgent is a research prototype and does not replace professional medical care. In an emergency, contact local emergency services immediately.</footer>
      </div>
      </div>
    </div>
  );
}
