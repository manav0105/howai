import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import './style.css';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function visitorId() {
  try {
    let id = localStorage.getItem('howai-visitor');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('howai-visitor', id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

function Mascot() {
  return <svg className="mascot" viewBox="0 0 120 120" aria-label="Kiko, your little AI guide" role="img"><path d="M24 54 17 18 47 36M76 36 103 18 96 56" fill="#c4afff" stroke="#30234d" strokeWidth="4" strokeLinejoin="round"/><path d="M26 49Q60 22 94 49L101 78Q91 108 60 108T19 78Z" fill="#fff6df" stroke="#30234d" strokeWidth="4"/><path d="m38 43 10-17 8 14 12-20 8 23" fill="#b296f7" stroke="#30234d" strokeWidth="3" strokeLinejoin="round"/><ellipse cx="42" cy="70" rx="6" ry="10" fill="#30234d"/><ellipse cx="78" cy="70" rx="6" ry="10" fill="#30234d"/><circle cx="44" cy="66" r="2" fill="white"/><circle cx="80" cy="66" r="2" fill="white"/><path d="M53 84q7 9 14 0" fill="none" stroke="#30234d" strokeWidth="3" strokeLinecap="round"/><ellipse cx="30" cy="83" rx="8" ry="4" fill="#f7aab5"/><ellipse cx="90" cy="83" rx="8" ry="4" fill="#f7aab5"/><path d="m102 6 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="#ffc74a"/></svg>;
}

function App() {
  const generate = useAction(api.lessons.generate);
  const [visitor] = useState(visitorId);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const touch = useRef(null);
  const card = cards[index];
  async function request(kind, target = index, level = 0) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await generate({ visitor, kind, index: target, level });
      if (result.error) { setError(result.error); return; }
      if (kind === 'quiz') { setQuiz(result.data.questions); setAnswers({}); setSubmitted(false); }
      else { setCards(old => { const next = [...old]; next[target] = { ...result.data, level }; return next; }); setIndex(target); }
    } catch { setError('Could not reach the lesson server. Check your connection and try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function next() {
    if (busy) return;
    if (index === 4) { request('quiz'); return; }
    if (cards[index + 1]) { setIndex(index + 1); setError(''); }
    else request('card', index + 1);
  }
  function back() { if (!busy && index > 0) { setIndex(index - 1); setError(''); } }
  const score = quiz?.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  return <main>
    <header><a className="wordmark" href="/" aria-label="HowAI home">How<span>AI</span><i>✦</i></a><span className="edition">A LITTLE WISER, EVERY SWIPE</span></header>
    <section className="intro"><span className="eyebrow">YOUR FIRST CHAPTER</span><h1>Big ideas.<br/><em>Small adventures.</em></h1><p>Meet AI, one little “aha!” at a time.</p></section>
    <section className="lesson" aria-label="What is AI lesson">
      <div className="lesson-top"><span className="pill">01 · WHAT IS AI?</span><span>{quiz ? 'QUICK CHECK' : `${card ? index + 1 : 0} / 5 CARDS`}</span></div>
      <div className="progress" aria-label={`${quiz ? 5 : card ? index + 1 : 0} of 5 cards`} >{[0,1,2,3,4].map(i => <span key={i} className={quiz || (card && i <= index) ? 'filled' : ''}/>)}</div>
      <div className="guide"><Mascot/><div><strong>Kiko</strong><span>Your curious little guide</span></div><span className="spark">✧</span></div>
      {error && <div className="error" role="alert">{error}</div>}
      <div aria-live="polite" className="status">{busy ? 'Kiko is thinking…' : ''}</div>
      {quiz ? <section className="bubble quiz"><span className="eyebrow">TIME FOR AN AHA! CHECK</span><h2>{submitted ? `${score} out of 3. Keep that curiosity!` : 'What stuck with you?'}</h2><p>Three tiny questions. You’ve got this.</p>
        {quiz.map((q, i) => <fieldset key={i} disabled={submitted}><legend>{i + 1}. {q.question}</legend>{q.options.map((option, j) => <label className={`option ${submitted && j === q.answer ? 'correct' : submitted && answers[i] === j ? 'incorrect' : ''}`} key={j}><input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers(a => ({ ...a, [i]: j }))}/><span>{option}</span></label>)}{submitted && <p className="feedback">{answers[i] === q.answer ? '✓ Correct! ' : `Correct answer: ${q.options[q.answer]}. `}{q.explanation}</p>}</fieldset>)}
        {!submitted ? <button className="primary" disabled={Object.keys(answers).length !== 3} onClick={() => setSubmitted(true)}>Check my answers →</button> : <button className="primary" onClick={() => { setQuiz(null); setIndex(0); setError(''); }}>Review the cards ↺</button>}
      </section> : <>
        <article className="bubble card" aria-busy={busy} onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { if (!touch.current || !card || busy) return; const dx = e.changedTouches[0].clientX - touch.current.x; const dy = e.changedTouches[0].clientY - touch.current.y; touch.current = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : back(); }}>
          <span className="eyebrow">{card ? card.level < 0 ? 'LET’S MAKE IT CLICK' : card.level > 0 ? 'A LITTLE DEEPER' : 'A NEW LITTLE DISCOVERY' : 'A NEW ADVENTURE AWAITS'}</span>
          <h2>{card?.title || 'So… what is AI, really?'}</h2><p className="body">{card?.body || 'Five bite-sized cards to turn a big, mysterious topic into something that makes sense.'}</p>
          {card ? <div className="example"><span>✦ PICTURE THIS</span>{card.imageUrl && <img key={card.imageUrl} className="example-image" src={card.imageUrl} alt="" onError={e => { e.currentTarget.hidden = true; }}/>}<p>{card.example}</p></div> : <div className="start-art" aria-hidden="true">✧ <span>あ</span> ✦</div>}
          {!card && <button className="primary" disabled={busy} onClick={() => request('card', 0)}> {busy ? 'Making your first card…' : 'Let’s learn →'}</button>}
        </article>
        {card && <><div className="actions"><button disabled={busy || card.level <= -3} onClick={() => request('card', index, card.level - 1)}>Didn't get it<span>Make it simpler</span></button><button disabled={busy || card.level >= 3} onClick={() => request('card', index, card.level + 1)}>Go deeper<span>Tell me more</span></button></div><button className="primary next" disabled={busy} onClick={next}>{index === 4 ? 'Next · 3-question quiz' : 'Next'} →</button><div className="swipe"><button onClick={back} disabled={busy || index === 0}>← Previous</button><span>Swipe left to continue · right to revisit</span></div></>}
      </>}
    </section>
    <footer>Small steps. Real understanding. <span>✦</span><br/><small>AI can make mistakes. Stay curious and check what you learn.<br/>No progress saved · 30 AI calls per browser each day (UTC)</small></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<ConvexProvider client={convex}><App/></ConvexProvider>);
