ion
const LESSONS=[{id:'daily',title:'Vie quotidienne',description:'Transports, rendez-vous et achats',questions:[{type:'choice',prompt:'Complète la phrase',sentence:'Ich fahre mit ___ Auto zur Arbeit.',options:['der','dem','das','den'],answer:'dem',audio:'Ich fahre mit dem Auto zur Arbeit.',explanation:'La préposition « mit » demande toujours le datif. « das Auto » devient « dem Auto ».'},{type:'choice',prompt:'Choisis la bonne traduction',sentence:'Je dois prendre rendez-vous demain.',options:['Ich muss morgen einen Termin vereinbaren.','Ich bin morgen einen Termin.','Ich mache gestern einen Termin.'],answer:'Ich muss morgen einen Termin vereinbaren.',audio:'Ich muss morgen einen Termin vereinbaren.',explanation:'« einen Termin vereinbaren » signifie prendre rendez-vous.'},{type:'choice',prompt:'Complète la phrase',sentence:'Ich warte ___ den Bus.',options:['für','auf','mit','bei'],answer:'auf',audio:'Ich warte auf den Bus.',explanation:'« warten auf » est suivi de l’accusatif.'},{type:'choice',prompt:'Choisis la bonne phrase',sentence:'Parce qu’il pleut, je reste à la maison.',options:['Weil es regnet, bleibe ich zu Hause.','Weil es regnet, ich bleibe zu Hause.','Weil regnet es, bleibe ich zu Hause.'],answer:'Weil es regnet, bleibe ich zu Hause.',audio:'Weil es regnet, bleibe ich zu Hause.',explanation:'Après « weil », le verbe conjugué va à la fin de la subordonnée.'},{type:'input',prompt:'Complète avec le bon mot',sentence:'Ich habe gestern Brot ___.',answer:'gekauft',audio:'Ich habe gestern Brot gekauft.',explanation:'Le participe passé de « kaufen » est « gekauft ».'}]},{id:'work',title:'Allemand professionnel',description:'Réunions, maintenance et production',questions:[{type:'choice',prompt:'Choisis la bonne traduction',sentence:'La machine est en panne.',options:['Die Maschine ist kaputt.','Die Maschine hat spät.','Die Maschine ist fertig.'],answer:'Die Maschine ist kaputt.',audio:'Die Maschine ist kaputt.',explanation:'« kaputt » signifie cassé ou en panne dans la langue courante.'},{type:'choice',prompt:'Complète la phrase',sentence:'Wir müssen ___ Fehler finden.',options:['der','den','dem','des'],answer:'den',audio:'Wir müssen den Fehler finden.',explanation:'« finden » prend un complément à l’accusatif : « den Fehler ».'},{type:'choice',prompt:'Choisis la bonne traduction',sentence:'Pouvez-vous vérifier le capteur ?',options:['Können Sie den Sensor überprüfen?','Müssen Sie der Sensor prüfen?','Sind Sie den Sensor?'],answer:'Können Sie den Sensor überprüfen?',audio:'Können Sie den Sensor überprüfen?',explanation:'« Können Sie ...? » est une demande polie ; « überprüfen » signifie vérifier.'},{type:'choice',prompt:'Complète la phrase',sentence:'Die Produktion beginnt ___ acht Uhr.',options:['um','am','im','zu'],answer:'um',audio:'Die Produktion beginnt um acht Uhr.',explanation:'Pour indiquer une heure précise, on utilise « um ».'},{type:'input',prompt:'Complète avec le bon mot',sentence:'Wir haben ein technisches ___.',answer:'Problem',audio:'Wir haben ein technisches Problem.',explanation:'« das Problem » est neutre ; après « ein », l’adjectif prend ici la terminaison -es.'}]}];
// Deutsch A2+ V0.2.2 — la bibliothèque est chargée séparément des exercices historiques.
const IS_TEST=/\/deutsch-a2-plus-test(?:\/|$)/.test(location.pathname);
const KEY=IS_TEST?'deutsch-a2-plus-test-v021':'deutsch-a2-plus-v021';
const emptyState=()=>({done:0,correct:0,mistakes:{},sessions:[],vocabulary:{},activeVocab:null});
let state;try{state={...emptyState(),...(JSON.parse(localStorage.getItem(KEY))||{})};}catch{state=emptyState();}
if(!state.vocabulary||typeof state.vocabulary!=='object')state.vocabulary={};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){console.warn('Sauvegarde impossible',e);}};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const screen=document.getElementById('screen');
let tab='learn',queue=[],pos=0,selected='',checked=false,score=0,mode='',currentGermanUtterance=null;
let vocabulary=[],catalog=null,loadError='';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dayNumber=d=>Math.floor(new Date(d+'T12:00:00').getTime()/86400000);
const record=id=>state.vocabulary[id]||{seen:false,attempts:0,correct:0,due:null,interval:0};
function speak(s){
 if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){alert('La synthèse vocale n’est pas disponible sur cet appareil.');return;}
 const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(s);
 utterance.lang='de-DE';utterance.rate=1;utterance.pitch=1;utterance.volume=1;
 const voices=synth.getVoices().filter(v=>/^de(?:-|$)/i.test(v.lang));
 if(voices.length)utterance.voice=voices.find(v=>v.lang.toLowerCase()==='de-de')||voices[0];
 const b=document.getElementById('speak');if(b)b.textContent='🔊 Lecture…';
 const restore=()=>{if(currentGermanUtterance===utterance){const btn=document.getElementById('speak');if(btn)btn.textContent='🔊 Écouter la phrase';}};
 utterance.onend=restore;utterance.onerror=e=>{restore();if(e.error!=='canceled'&&e.error!=='interrupted')console.warn('Audio indisponible',e.error);};
 currentGermanUtterance=utterance;synth.speak(utterance);if(synth.paused)synth.resume();
}
function allQuestions(){return LESSONS.flatMap(l=>l.questions.map((q,i)=>({...q,key:l.id+'-'+i,lesson:l.title})));}
// V0.2.2 : découverte complète puis évaluation séparée, sans réponse affichée.
// La clé de stockage V0.2.1 est conservée pour préserver les progrès existants.
let view='home';
const norm=s=>String(s||'').trim().toLocaleLowerCase('de').normalize('NFC').replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const dayOrder=(a,b)=>(Number(a.day)||999)-(Number(b.day)||999)||a.id.localeCompare(b.id);
function todaysWords(){
 const remaining=vocabulary.filter(w=>!record(w.id).seen);
 const seenToday=vocabulary.filter(w=>record(w.id).firstSeen===today());
 const dailyLeft=Math.max(0,6-seenToday.filter(w=>w.category==='everyday').length);
 const proLeft=Math.max(0,4-seenToday.filter(w=>w.category==='professional').length);
 return [...remaining.filter(w=>w.category==='everyday').sort(dayOrder).slice(0,dailyLeft),
  ...remaining.filter(w=>w.category==='professional').sort(dayOrder).slice(0,proLeft)];
}
function dueWords(){
  return vocabulary
    .filter(w=>{
      const r=record(w.id);
      return r.seen && r.due && r.due<=today();
    })
    .sort((a,b)=>{
      const dateA=record(a.id).due;
      const dateB=record(b.id).due;
      return dateA.localeCompare(dateB);
    });
}

function reviewWords(){
  return dueWords().slice(0,10);
}
function vocabById(id){return vocabulary.find(w=>w.id===id);}
function activeWords(){return (state.activeVocab?.ids||[]).map(vocabById).filter(Boolean);}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function markDiscovered(w){const r=record(w.id);if(!r.seen)state.vocabulary[w.id]={...r,seen:true,firstSeen:today(),due:today()};}
function startVocabulary(words,kind){
 if(!words.length)return;
 // Un brouillon interrompu n'est jamais écrasé sans confirmation.
 if(state.activeVocab&&!confirm('Une séance est en cours. La remplacer ?'))return;
 const ids=words.map(w=>w.id);
 const initialTotal=ids.length;
state.activeVocab={
  kind,
  phase:kind==='new'?'discover':'quiz',
  ids,
  order:shuffle(ids),
  pos:0,
  score:0,
  answered:null,
  repeatIds:[],
repeating:false,
initialTotal
};
 if(kind==='new')words.forEach(markDiscovered);
 save();showVocabulary();
}
function finishDiscovery(){
 const s=state.activeVocab;if(!s)return;
 s.phase='quiz';s.pos=0;s.answered=null;save();showVocabulary();
}
function nextVocabulary(){
  const s=state.activeVocab;
  if(!s)return;

  s.pos++;
  s.answered=null;

  // À la fin des questions normales, ajouter une seule
  // répétition pour chaque mot incorrect.
  if(
    s.pos>=s.order.length &&
    !s.repeating &&
    Array.isArray(s.repeatIds) &&
    s.repeatIds.length>0
  ){
    s.order.push(...s.repeatIds);
    s.repeating=true;
  }

  save();
  showVocabulary();
}
function wordAnswer(w){return norm(w.word);}
function acceptGerman(input,word){
  const answer=wordAnswer(word);
  const given=norm(input);

  // L'article, l'orthographe et les caractères allemands
  // doivent être corrects.
  // Les majuscules et les espaces superflus sont tolérés.
  return given===answer;
}
function vocabQuestion(w,index,kind){
 // Une question sur deux est une production en allemand, les autres testent la compréhension.
 const reverse=kind==='review'||index%2===0;
 return reverse?{
  prompt:'Écris le mot ou l’expression en allemand',clue:w.translation,
  type:'input',answer:w.word,audio:null
 }:{prompt:'Que signifie ce mot en français ?',clue:w.word,
  type:'choice',answer:w.translation,audio:w.word};
}
function choiceOptions(w){
 const others=shuffle(vocabulary.filter(x=>x.id!==w.id&&x.category===w.category&&norm(x.translation)!==norm(w.translation)));
 const unique=[];for(const x of others){if(!unique.some(v=>norm(v)===norm(x.translation)))unique.push(x.translation);if(unique.length===3)break;}
 return shuffle([w.translation,...unique]);
}
function showVocabulary(){
 view='vocab';
 const s=state.activeVocab;if(!s)return render();
 const words=activeWords();if(!words.length){state.activeVocab=null;save();return render();}
 if(s.phase==='discover'){
  if(s.pos>=words.length){screen.innerHTML=`<div class="card"><span class="tag">Découverte terminée</span><h2>À toi de jouer !</h2><p>Tu as étudié ${words.length} mots. Les réponses ne seront plus affichées pendant l’évaluation.</p><button class="primary" id="beginQuiz">Commencer les exercices</button></div>`;return;}
  const w=words[s.pos];
  screen.innerHTML=`<div class="card"><span class="tag">Découverte · ${s.pos+1}/${words.length} · ${w.category==='professional'?'Professionnel':'Quotidien'}</span><div class="progress"><div class="fill" style="width:${100*s.pos/words.length}%"></div></div><h2>${escapeHTML(w.word)}</h2><p><strong>${escapeHTML(w.translation)}</strong></p><div class="sentence">${escapeHTML(w.example_de)}</div><p class="muted">${escapeHTML(w.example_fr)}</p><button class="secondary" id="speak">🔊 Écouter la phrase</button><p class="muted small">Sur iPhone, désactive le mode silencieux si nécessaire.</p><button class="primary" id="nextVocab">${s.pos===words.length-1?'Terminer la découverte':'Mot suivant'}</button></div>`;
  return;
 }
if(s.pos>=s.order.length){
  const total=s.initialTotal||s.ids.length;
  const result=`${s.score} / ${total}`;
  state.sessions.push({
    date:new Date().toISOString(),
    mode:s.kind==='new'?'Évaluation vocabulaire':'Révisions vocabulaire',
    score:s.score,
    total
  });
  state.activeVocab=null;save();
  screen.innerHTML=`<div class="card"><span class="tag">Séance terminée</span><h2>Résultat</h2><div class="stat">${result}</div><p class="muted">Les mots seront reproposés lors des prochaines révisions.</p><button class="primary" id="back">Retour à l’accueil</button></div>`;
  return;
 }
 const w=vocabById(s.order[s.pos]);if(!w){s.pos++;save();return showVocabulary();}
 const q=vocabQuestion(w,s.pos,s.kind);
 const opts=q.type==='choice'?choiceOptions(w):[];
 // Conserver l'ordre des choix pendant la question, même après une fermeture de l'app.
 if(q.type==='choice'){
  if(!Array.isArray(s.options)||s.optionId!==w.id){s.options=opts;s.optionId=w.id;save();}
 }
 const input=q.type==='input'?'<input type="text" id="typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ta réponse en allemand">':s.options.map((o,i)=>`<button class="option" data-option="${i}">${escapeHTML(o)}</button>`).join('');
 screen.innerHTML=`<div class="card"><span class="tag">Évaluation · ${s.pos+1}/${s.order.length}</span><div class="progress"><div class="fill" style="width:${100*s.pos/s.order.length}%"></div></div><h2>${escapeHTML(q.prompt)}</h2><div class="sentence">${escapeHTML(q.clue)}</div>${q.audio?'<button class="secondary" id="speak">🔊 Écouter le mot</button>':''}<div id="choices">${input}</div><div id="feedback"></div><button class="primary" id="check" disabled>Vérifier</button></div>`;
 selected='';checked=false;
 if(s.answered){displayVocabularyFeedback(s.answered,w,q);}
}
function displayVocabularyFeedback(result,w,q){
 checked=true;
 const feedback=document.getElementById('feedback');if(!feedback)return;
 // Signaler les différences de majuscules sans pénaliser.
const capitalizationWarning=
  result.ok &&
  q.type==='input' &&
  typeof result.given==='string' &&
  result.given.trim().replace(/\s+/g,' ') !==
    q.answer.trim().replace(/\s+/g,' ') &&
  norm(result.given)===norm(q.answer)
    ? '<p class="muted">💡 Attention aux majuscules en allemand. Vérifie l’orthographe affichée.</p>'
    : '';
 feedback.innerHTML=`<div class="feedback ${result.ok?'':'bad'}"><strong>${result.ok?'✓ Richtig !':'À revoir'}</strong><p>Bonne réponse : <strong>${escapeHTML(q.answer)}</strong></p><p>${escapeHTML(w.example_de)}</p><p>${escapeHTML(w.example_fr)}</p>${capitalizationWarning}</div>`;
 document.querySelectorAll('.option').forEach(b=>b.disabled=true);
 const input=document.getElementById('typed');if(input)input.disabled=true;
 const btn=document.getElementById('check');btn.textContent=state.activeVocab.pos===state.activeVocab.order.length-1?'Terminer':'Continuer';btn.disabled=false;
}
function checkVocabulary(){
 const s=state.activeVocab;if(!s||s.phase!=='quiz'||s.answered||!selected.trim())return;
 const w=vocabById(s.order[s.pos]),q=vocabQuestion(w,s.pos,s.kind);
 const ok=q.type==='input'?acceptGerman(selected,w):norm(selected)===norm(q.answer);
 // Une répétition supplémentaire ne modifie pas
// le calendrier de révision ni le score initial.
if(s.repeating){
  s.answered={ok,given:selected};
save();
displayVocabularyFeedback(s.answered,w,q);
  return;
}
 const r=record(w.id),previous=r.interval||0;
 // Mémoriser les mots incorrects pour une répétition en fin de séance.
if(!ok && !s.repeating){
  if(!Array.isArray(s.repeatIds)){
    s.repeatIds=[];
  }

  if(!s.repeatIds.includes(w.id)){
    s.repeatIds.push(w.id);
  }
}
 const interval=ok?(previous>=14?30:previous>=7?14:previous>=3?7:previous>=1?3:1):1;
 const dueDate=new Date(today()+'T12:00:00');dueDate.setDate(dueDate.getDate()+interval);
 state.vocabulary[w.id]={...r,seen:true,firstSeen:r.firstSeen||today(),attempts:(r.attempts||0)+1,correct:(r.correct||0)+(ok?1:0),interval:ok?interval:0,due:`${dueDate.getFullYear()}-${String(dueDate.getMonth()+1).padStart(2,'0')}-${String(dueDate.getDate()).padStart(2,'0')}`};
 state.done++;if(ok){state.correct++;s.score++;}
 s.answered={ok};save();displayVocabularyFeedback(s.answered,w,q);
}
function render(){
 view='home';
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='learn'){
  const seen=vocabulary.filter(w=>record(w.id).seen).length;
  const todaySeen=vocabulary.filter(w=>record(w.id).firstSeen===today()).length;
  const available=todaysWords();
  const active=state.activeVocab;
  const info=loadError?`<p class="muted">Bibliothèque indisponible : ${escapeHTML(loadError)}. Les leçons classiques restent accessibles.</p>`:
   !vocabulary.length?'<p class="muted">Chargement de la bibliothèque…</p>':
   `<div class="card"><span class="tag">Vocabulaire · ${vocabulary.length} mots</span><h2>Mes 10 nouveaux mots</h2><p class="muted">6 quotidiens + 4 professionnels · ${seen} mots découverts · ${todaySeen} aujourd’hui</p>${active?'<button class="primary" id="resumeVocab">Reprendre ma séance</button>':`<button class="primary" id="vocabStart" ${available.length?'':'disabled'}>${available.length?'Découvrir '+available.length+' mot(s)':'Objectif du jour atteint ou bibliothèque épuisée'}</button>`}<p class="muted small">Découverte des mots, puis évaluation sans les réponses.</p></div>`;
  screen.innerHTML='<h2>Apprendre</h2>'+info+'<h2>Leçons classiques</h2><p class="muted">5 exercices par session · environ 5 minutes</p>'+LESSONS.map(l=>`<div class="card"><span class="tag">${l.questions.length} exercices</span><h2 style="margin-top:12px">${escapeHTML(l.title)}</h2><p class="muted">${escapeHTML(l.description)}</p><button class="primary" data-start="${l.id}">Commencer</button></div>`).join('');
 }else if(tab==='review'){
  const qs=allQuestions().filter(q=>state.mistakes[q.key]>0),due=dueWords();
  screen.innerHTML=`<h2>Mes révisions</h2><div class="card"><h2>Vocabulaire</h2><div class="stat">${due.length}</div><p class="muted">Mot(s) à réviser aujourd’hui</p>${state.activeVocab?'<p>Termine d’abord ta séance en cours dans Apprendre.</p>':`<button class="primary" id="vocabReview" ${due.length?'':'disabled'}>Réviser le vocabulaire</button>`}</div><div class="card"><h2>Exercices classiques</h2><div class="stat">${qs.length}</div><p class="muted">Question(s) à retravailler</p>${qs.length?'<button class="primary" id="reviewStart">Réviser maintenant</button>':'<p>Aucune erreur à réviser.</p>'}</div>`;
 }else{
  const pct=state.done?Math.round(state.correct/state.done*100):0;
  const seen=vocabulary.filter(w=>record(w.id).seen).length;
  screen.innerHTML=`<h2>Ma progression</h2><div class="card"><div class="stat">${seen} / ${vocabulary.length||'—'}</div><p class="muted">Mots découverts</p></div><div class="card"><div class="stat">${dueWords().length}</div><p class="muted">Mots à réviser aujourd’hui</p></div><div class="card"><div class="stat">${state.done}</div><p class="muted">Questions répondues</p></div><div class="card"><div class="stat">${pct}%</div><p class="muted">Réponses correctes</p><div class="progress"><div class="fill" style="width:${pct}%"></div></div></div><div class="card"><div class="stat">${state.sessions.length}</div><p class="muted">Sessions terminées</p></div><button class="secondary" id="reset">Réinitialiser les données de cette version</button>`;
 }
}
function start(qs,m){queue=qs;pos=0;score=0;mode=m;showQuestion();}
function showQuestion(){
 view='classic';
 selected='';checked=false;
 if(pos>=queue.length){state.sessions.push({date:new Date().toISOString(),mode,score,total:queue.length});save();screen.innerHTML=`<div class="card"><span class="tag">Session terminée</span><h2>Bien joué ! 🎉</h2><div class="stat">${score} / ${queue.length}</div><p class="muted">Les erreurs restent disponibles dans Réviser.</p><button class="primary" id="back">Retour à l’accueil</button></div>`;return;}
 const q=queue[pos];
 screen.innerHTML=`<div class="card"><span class="tag">${escapeHTML(q.lesson)}</span><p class="muted">Question ${pos+1} sur ${queue.length}</p><div class="progress"><div class="fill" style="width:${pos/queue.length*100}%"></div></div><h2>${escapeHTML(q.prompt)}</h2><div class="sentence">${escapeHTML(q.sentence)}</div><button class="secondary" id="speak">🔊 Écouter la phrase</button><p class="muted small">Sur iPhone, désactive le mode silencieux pour entendre la prononciation.</p><div id="choices">${q.type==='choice'?q.options.map((o,i)=>`<button class="option" data-option="${i}">${escapeHTML(o)}</button>`).join(''):'<p class="muted">Écris le mot manquant :</p><input type="text" id="typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ta réponse">'}</div><div id="feedback"></div><button class="primary" id="check" disabled>Vérifier</button></div>`;
}
function check(){
 const q=queue[pos];if(!selected.trim()||checked)return;checked=true;
 const ok=norm(selected)===norm(q.answer);state.done++;if(ok){state.correct++;score++;delete state.mistakes[q.key];}else state.mistakes[q.key]=(state.mistakes[q.key]||0)+1;
 save();document.getElementById('feedback').innerHTML=`<div class="feedback ${ok?'':'bad'}"><strong>${ok?'✓ Richtig !':'À revoir'}</strong><p>Bonne réponse : <strong>${escapeHTML(q.answer)}</strong></p><p>${escapeHTML(q.explanation)}</p></div>`;
 document.querySelectorAll('.option').forEach(b=>b.disabled=true);const input=document.getElementById('typed');if(input)input.disabled=true;
 const btn=document.getElementById('check');btn.textContent=pos===queue.length-1?'Terminer':'Continuer';btn.disabled=false;
}
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.tab){tab=t.dataset.tab;render();}
 else if(t.dataset.start){const l=LESSONS.find(l=>l.id===t.dataset.start);if(l)start(l.questions.map((q,i)=>({...q,key:l.id+'-'+i,lesson:l.title})),l.title);}
 else if(t.id==='vocabStart'){startVocabulary(todaysWords(),'new');}
 else if(t.id==='resumeVocab'){showVocabulary();}
 else if(t.id==='nextVocab'){const s=state.activeVocab;if(s){s.pos++;save();showVocabulary();}}
 else if(t.id==='beginQuiz'){finishDiscovery();}
 else if(t.id==='vocabReview'){startVocabulary(reviewWords(),'review');}
 else if(t.id==='reviewStart'){start(allQuestions().filter(q=>state.mistakes[q.key]>0),'Révisions');}
 else if(t.id==='speak'){
  const s=state.activeVocab;
  if(view==='vocab'&&s&&document.getElementById('nextVocab')){const w=activeWords()[s.pos];if(w)speak(w.example_de);}
  else if(view==='vocab'&&s&&s.phase==='quiz'){const w=vocabById(s.order[s.pos]);if(w)speak(w.word);}
  else if(queue[pos])speak(queue[pos].audio);
 }
 else if(t.dataset.option!==undefined&&!checked){
  const s=state.activeVocab;
  selected=view==='vocab'&&s&&s.phase==='quiz'?s.options[Number(t.dataset.option)]:queue[pos].options[Number(t.dataset.option)];
  document.querySelectorAll('.option').forEach(b=>b.classList.toggle('selected',b===t));document.getElementById('check').disabled=false;
 }
 else if(t.id==='check'){
  const s=state.activeVocab;
  if(view==='vocab'&&s&&s.phase==='quiz'){if(s.answered)nextVocabulary();else checkVocabulary();}
  else if(checked){pos++;showQuestion();}else check();
 }
 else if(t.id==='back'){tab='learn';render();}
 else if(t.id==='reset'){if(confirm('Effacer uniquement la progression de cette version de Deutsch A2+ ?')){state=emptyState();save();render();}}
});
document.addEventListener('input',e=>{if(e.target.id==='typed'){selected=e.target.value;document.getElementById('check').disabled=!selected.trim();}});
async function loadVocabulary(){
 try{
  const [catalogResponse,vocabResponse]=await Promise.all([fetch('./data/catalog.json',{cache:'no-cache'}),fetch('./data/vocabulary.json',{cache:'no-cache'})]);
  if(!catalogResponse.ok||!vocabResponse.ok)throw new Error('fichiers JSON introuvables');
  const [c,v]=await Promise.all([catalogResponse.json(),vocabResponse.json()]);
  if(!Array.isArray(v.words)||!v.words.length)throw new Error('aucun mot dans vocabulary.json');
  const ids=new Set();for(const w of v.words){if(!w.id||!w.word||!w.translation||!w.example_de||!w.example_fr||!['everyday','professional'].includes(w.category)||ids.has(w.id))throw new Error('bibliothèque invalide (champs ou identifiants)');ids.add(w.id);}
  catalog=c;vocabulary=v.words;loadError='';
 }catch(e){loadError=e.message||'erreur de chargement';console.warn('Bibliothèque',e);}
 render();
}
render();loadVocabulary();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
