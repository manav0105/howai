import React, { useEffect, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

export default function Activity({ visitor, onReview }) {
  const getActivity = useAction(api.activities.get);
  const getHint = useAction(api.activities.hint);
  const [activity, setActivity] = useState(null);
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [help, setHelp] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const hintLock = useRef(false);
  const started = useRef(false);
  async function load() {
    if (lock.current) return;
    lock.current = true; setLoading(true); setError('');
    try {
      const result = await getActivity({ visitor });
      if (result.error) setError(result.error);
      else setActivity(result.data);
    } catch { setError('Could not reach the activity server. Check your connection and try again.'); }
    finally { lock.current = false; setLoading(false); }
  }
  useEffect(() => { if (!started.current) { started.current = true; load(); } }, []);
  async function send(event) {
    event.preventDefault();
    if (hintLock.current || !question.trim()) return;
    hintLock.current = true; setSending(true); setError('');
    const message = question.trim();
    try {
      const result = await getHint({ visitor, message, history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })) });
      if (result.error) setError(result.error);
      else { setMessages(old => [...old, { role: 'user', text: message }, { role: 'model', text: result.text }]); setQuestion(''); }
    } catch { setError('Could not reach the hint server. Your question is still here; please try again.'); }
    finally { hintLock.current = false; setSending(false); }
  }
  if (status !== 'active') return <section className="bubble activity"><span className="eyebrow">CHAPTER FINISHED</span><h2>{status === 'done' ? 'Activity complete! ✦' : 'Activity skipped'}</h2><p role="status">{status === 'done' ? 'You tried it for yourself. That’s a little more understanding.' : 'You’ve reached the end of this lesson. You can try the activity another time.'}</p><p className="activity-note">Marked {status === 'done' ? 'complete' : 'skipped'} for this visit only. Progress isn’t saved.</p><button className="primary" onClick={onReview}>Review the cards ↺</button></section>;
  return <section className="bubble activity" aria-busy={loading}>
    <span className="eyebrow">TRY IT YOURSELF · 5–10 MINUTES</span>
    <h2>{activity?.title || 'A little hands-on adventure'}</h2>
    {error && <div className="error" role="alert">{error}</div>}
    {loading && <p role="status">Kiko is getting your activity…</p>}
    {!loading && !activity && <><button className="primary" onClick={load}>Try activity again</button><button className="activity-skip" onClick={() => setStatus('skipped')}>Skip</button></>}
    {activity && <>
      <p>Use <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer">Gemini’s free text chat ↗</a> on your phone or laptop. A Google sign-in may be needed; no paid plan or download needed.</p>
      <ol className="activity-steps">{activity.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
      <div className="example"><span>✦ TRY THIS PROMPT</span><p className="activity-prompt">{activity.prompt}</p></div>
      <p><strong>Think about it:</strong> {activity.reflection}</p>
      <div className="activity-buttons"><button className="primary" disabled={sending} onClick={() => setStatus('done')}>Done</button><button disabled={sending} onClick={() => setHelp(true)} aria-expanded={help} aria-controls="activity-help">I need help</button><button disabled={sending} onClick={() => setStatus('skipped')}>Skip</button></div>
      {help && <section id="activity-help" className="activity-help" aria-label="Activity hints"><h3>A little hint from Kiko</h3><p>Ask about a step in this activity.</p><div className="hint-messages" aria-live="polite">{messages.map((m, i) => <p key={i} className={m.role === 'user' ? 'hint-user' : 'hint-kiko'}><strong>{m.role === 'user' ? 'You' : 'Kiko'}:</strong> {m.text}</p>)}{sending && <p role="status">Kiko is thinking…</p>}</div><form onSubmit={send}><label htmlFor="hint-question">Where are you stuck?</label><textarea id="hint-question" rows="2" maxLength={800} value={question} disabled={sending} onChange={e => setQuestion(e.target.value)} placeholder="How do I change one detail in the prompt?"/><button className="primary" disabled={sending || !question.trim()} type="submit">{sending ? 'Getting a hint…' : 'Send'}</button></form></section>}
      <p className="activity-note">Completion and hint chat stay in this visit only.</p>
    </>}
  </section>;
}
