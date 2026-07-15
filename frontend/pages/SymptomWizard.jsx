import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sendMessage, geocodeLocation, findNearbyHospitals } from '../services/apiService';
import { formatReply } from '../utils/formatReply';
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

const ArrowIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}><path d="M5 12h14M13 5l7 7-7 7" /></svg>
);

const WarningIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M12 9v4M12 17h.01M10.3 3.9L2.8 17a1.7 1.7 0 0 0 1.5 2.5h15.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a1.7 1.7 0 0 0-3 0Z" /></svg>
);

export default function SymptomWizard() {
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

  // Keep scroll-padding-top matched to the sticky header+journey block's
  // actual height, instead of guessing a fixed offset — avoids content
  // landing partly hidden behind the sticky bar after scrollIntoView.
  useEffect(() => {
    const root = rootRef.current;
    const sticky = stickyTopRef.current;
    if (!root || !sticky) return;

    function update() {
      const isSticky = getComputedStyle(sticky).position === 'sticky';
      const h = sticky.getBoundingClientRect().height;
      root.style.scrollPaddingTop = isSticky ? `${h + 16}px` : '0px';
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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

  async function callChat(message) {
    const res = await sendMessage(message, {
      conversationId: conversationId ?? undefined,
      preset: 'default',
    });
    setConversationId(res.conversation_id);
    return res.reply;
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
    setLoadingStage('analyze');
    try {
      const reply = await callChat(text);
      setAssessment(reply);
      setStep((s) => Math.max(s, 2));
    } catch (err) {
      setError(err?.message || 'Could not reach MediAgent. Please try again.');
    } finally {
      setLoadingStage(null);
    }
  }

  async function handleFirstAid() {
    setError('');
    setLoadingStage('aid');
    try {
      const reply = await callChat(
        "Based on what I just described, give me clear, step-by-step first aid or home-care guidance I can follow right now. Keep it as a short numbered list."
      );
      setAid(reply);
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

    const [aiResult] = await Promise.allSettled([
      callChat(message),
      loadNearbyHospitals(loc),
    ]);

    if (aiResult.status === 'fulfilled') {
      setCare(aiResult.value);
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

  return (
    <div className="symptom-wizard" ref={rootRef}>
      <div className="sticky-top" ref={stickyTopRef}>
        <header>
          <div className="header-inner">
            <div className="brand">
              <svg className="brand-mark" viewBox="0 0 24 24" fill="none">
                <path d="M2 12h4l2-7 4 14 2-9 2 5h6" stroke="#1F6F5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <div className="brand-name">MediAgent</div>
                <div className="brand-tag">Symptoms → first aid → nearest care</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="disclaimer-pill">
                <WarningIcon />
                Informational only, not a diagnosis
              </div>
              <FirebaseAuth />
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
      </div>

      <div className="wrap">
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
          </section>
        )}

        <footer>MediAgent is a research prototype and does not replace professional medical care. In an emergency, contact local emergency services immediately.</footer>
      </div>
    </div>
  );
}
