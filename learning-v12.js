/* Dữ liệu học liệu duy nhất: mọi trò cùng dùng chữ, từ, tranh và tên chữ này. */
const letterRows=[
 ['a','A','áo dài','a.webp',1,'a'],['ă','Ă','ăn','aw.webp',1,'á'],['â','Â','ấm áp','aa.webp',1,'ớ'],
 ['b','B','bóng','b.webp',0,'bê'],['c','C','cá','c.webp',0,'xê'],['d','D','dê','d.webp',0,'dê'],
 ['đ','Đ','đèn','dd.webp',0,'đê'],['e','E','em bé','e.webp',1,'e'],['ê','Ê','ếch','ee.webp',1,'ê'],
 ['g','G','gà','g.webp',0,'giê'],['h','H','hoa sen','h.webp',0,'hát'],['i','I','mực in','i.webp',1,'i'],
 ['k','K','kem','k.webp',0,'ca'],['l','L','lá','l.webp',0,'e lờ'],['m','M','mèo','m.webp',0,'em mờ'],
 ['n','N','na','n.webp',0,'en nờ'],['o','O','ong','o.webp',1,'o'],['ô','Ô','ô tô','oo.webp',1,'ô'],
 ['ơ','Ơ','ớt','ow.webp',1,'ơ'],['p','P','pin','p-pin.webp',0,'pê'],['q','Q','quà','q.webp',0,'cu'],
 ['r','R','rùa','r.webp',0,'e rờ'],['s','S','sóc','s-soc.webp',0,'ét xì'],
 ['t','T','táo','t.webp',0,'tê'],['u','U','uống nước','u.webp',1,'u'],['ư','Ư','ươm mầm','uw.webp',1,'ư'],
 ['v','V','vịt','v.webp',0,'vê'],['x','X','xe','x.webp',0,'ích xì'],['y','Y','y tế','y.webp',1,'i dài']
];
const letters=letterRows.map(([id,upper,word,file,vowel,name])=>({id,upper,word,vowel:!!vowel,name,art:file.startsWith('..')?'assets/numbers/star-v1.webp':'assets/letters/'+file}));
const byLetter=Object.fromEntries(letters.map(x=>[x.id,x]));
const soundNames={a:'a',ă:'á',â:'ớ',b:'bờ',c:'cờ',d:'dờ',đ:'đờ',e:'e',ê:'ê',g:'gờ',h:'hờ',i:'i',k:'cờ',l:'lờ',m:'mờ',n:'nờ',o:'o',ô:'ô',ơ:'ơ',p:'pờ',q:'quờ',r:'rờ',s:'sờ',t:'tờ',u:'u',ư:'ư',v:'vờ',x:'xờ',y:'i'};
const numberWords=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín','mười'];
const countItems=[
 {name:'quả táo',asset:'assets/numbers/apple-v1.webp'},
 {name:'vịt con',asset:'assets/numbers/duck-v1.webp'},
 {name:'ngôi sao',asset:'assets/numbers/star-v1.webp'},
 {name:'bông hoa',asset:'assets/numbers/flower-v1.webp'},
 {name:'chú ong',asset:'assets/numbers/bee-v1.webp'}
];
const $=id=>document.getElementById(id);
function random(max){return Math.floor(Math.random()*max)}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function distinctChoices(correct,pool,n=3){return shuffle([correct,...shuffle(pool.filter(x=>x!==correct)).slice(0,n-1)])}
function renderStats(id,round){const el=$(id);if(el)el.textContent=round.solved?'Hoàn thành sau '+round.attempts+' lượt chọn.':'Đã thử '+round.attempts+' lượt.'}
function feedback(id,kind,message,spoken=message){const el=$(id);el.dataset.result=kind;el.textContent=message;el.setAttribute('role','status');if(kind==='correct')tone('good');if(kind==='retry')tone('retry');if(spoken)speak(spoken)}
function markDone(round){if(round.solved)return false;round.solved=true;progress++;$('bar').style.width=Math.min(100,progress/12*100)+'%';$('progressText').textContent='Bé đã hoàn thành '+progress+' lượt chơi trong lần học này.';return true}
let progress=0;
function newRound(target){return {target,attempts:0,solved:false,lastAttempt:0}}
function answer(round,value,feedbackId,success,retry,statsId){const now=Date.now();if(round.solved||now-round.lastAttempt<320)return;round.lastAttempt=now;round.attempts++;const ok=value===round.target;if(ok){markDone(round);feedback(feedbackId,'correct',success(round.attempts),success(round.attempts))}else feedback(feedbackId,'retry',retry(round.attempts),retry(round.attempts));renderStats(statsId,round);return ok}
function disableAnswers(parent){parent.querySelectorAll('button').forEach(b=>b.disabled=true)}
function label(x){return 'chữ '+x.name}
function wordLine(x){return x.id==='q'?'Chữ cu đi cùng u tạo quờ trong tiếng quà.':x.id==='i'?'Chữ i có trong mực in.':x.id==='p'?'Chữ pê trong từ pin.':'Chữ '+x.name+' như '+x.word+'.'}
function letterPrompt(x){return 'Bé nhìn tranh '+x.word+'. '+wordLine(x)}

/* Một bộ điều phối âm thanh: lời mới hủy lời cũ, video và micro không chồng nhau. */
let audio=null,audioUrl='',controller=null,voiceSeq=0,lastVoice='',lastVoiceTime=0,ctxTone=null,voiceDbPromise=null;
const audioCache=new Map();
function status(message,type=''){const node=$('voiceStatus');node.textContent=message;node.dataset.state=type}
function stopVoice(){voiceSeq++;if(controller){controller.abort();controller=null}if(audio){audio.pause();audio.currentTime=0;audio=null}if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=''}if('speechSynthesis'in window)speechSynthesis.cancel()}
function pauseVideos(){document.querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause()})}
function stopSound(){stopVoice();pauseVideos()}
function tone(type){try{ctxTone=ctxTone||new (window.AudioContext||window.webkitAudioContext)();if(ctxTone.state==='suspended')ctxTone.resume();const oscillator=ctxTone.createOscillator(),gain=ctxTone.createGain(),now=ctxTone.currentTime;oscillator.type='sine';oscillator.frequency.setValueAtTime(type==='good'?660:420,now);oscillator.frequency.exponentialRampToValueAtTime(type==='good'?880:360,now+.17);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.09,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.27);oscillator.connect(gain).connect(ctxTone.destination);oscillator.start(now);oscillator.stop(now+.29)}catch(e){}}
function settings(){if($('modal').classList.contains('open'))return {mode:$('voiceMode').value,key:$('apiKey').value.trim()};try{return JSON.parse(localStorage.getItem('beVuiSettings')||'{}')}catch(e){return {mode:'browser'}}}
function nativeVoice(text,seq){if(!('speechSynthesis'in window))return false;const voices=speechSynthesis.getVoices();const vi=voices.filter(v=>/^vi([_-]VN)?$/i.test(v.lang)||/vietnam/i.test(v.name));const voice=vi.find(v=>/female|nữ|hoai|my|linh/i.test(v.name))||vi[0];if(!voice){status('Máy chưa có giọng Việt. Cô có thể chọn API trong Góc giáo viên.','error');return false}const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang='vi-VN';u.rate=.78;u.pitch=1.05;u.volume=.72;u.onerror=()=>{if(seq===voiceSeq)status('Giọng thiết bị chưa phát được. Cô kiểm tra âm lượng.','error')};speechSynthesis.speak(u);return true}
function voiceDb(){if(!('indexedDB'in window))return Promise.resolve(null);if(!voiceDbPromise)voiceDbPromise=new Promise(resolve=>{const req=indexedDB.open('be-vui-voice-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('clips');req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null)});return voiceDbPromise}
async function storedVoice(signature){try{const db=await voiceDb();if(!db)return null;return await new Promise(resolve=>{const request=db.transaction('clips','readonly').objectStore('clips').get(signature);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>resolve(null)})}catch(e){return null}}
async function keepVoice(signature,blob){try{const db=await voiceDb();if(!db)return;db.transaction('clips','readwrite').objectStore('clips').put(blob,signature)}catch(e){}}
async function apiVoice(text,key,seq){const signature='marin-v12|'+text;if(audioCache.has(signature))return audioCache.get(signature);const stored=await storedVoice(signature);if(seq!==voiceSeq)return null;if(stored){audioCache.set(signature,stored);return stored}controller=new AbortController();const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'marin',response_format:'mp3',input:text,instructions:'Giọng cô giáo mầm non nữ, mềm và ấm, tiếng Việt tự nhiên, tốc độ chậm vừa, âm lượng nhỏ, không gằn, không hô hào. Đọc đúng từng từ đã viết, có khoảng nghỉ ngắn giữa các câu. Tên chữ cu là tên chữ q riêng; quờ là âm ghép qu trong từ quà.'})});if(!response.ok)throw Error('API '+response.status);const blob=await response.blob();if(seq!==voiceSeq)return null;controller=null;audioCache.set(signature,blob);keepVoice(signature,blob);if(audioCache.size>90)audioCache.delete(audioCache.keys().next().value);return blob}
async function speak(raw){const text=String(raw||'').trim();if(!text)return;const now=Date.now(),sig=settings().mode+'|'+text;if(sig===lastVoice&&(now-lastVoiceTime<700||controller||audio))return;lastVoice=sig;lastVoiceTime=now;pauseVideos();stopVoice();const seq=voiceSeq,st=settings();if(st.mode!=='openai'||!st.key){if(st.mode==='openai'&&!st.key)status('Chưa có khóa API. Đang dùng giọng Việt trên thiết bị nếu có.','wait');nativeVoice(text,seq);return}try{status('Cô đang chuẩn bị giọng đọc…','wait');const blob=await apiVoice(text,st.key,seq);if(!blob||seq!==voiceSeq)return;audioUrl=URL.createObjectURL(blob);audio=new Audio(audioUrl);audio.volume=.7;audio.onended=()=>{if(seq===voiceSeq){audio=null;URL.revokeObjectURL(audioUrl);audioUrl='';status('Đã đọc xong.','ok')}};await audio.play();if(seq===voiceSeq)status('Cô đang đọc.','ok')}catch(err){if(err.name==='AbortError'||seq!==voiceSeq)return;controller=null;status('Không tải được giọng API ('+(err.message||'lỗi mạng')+'). Thử giọng Việt trên thiết bị.','error');nativeVoice(text,seq)}}
function openTeacher(){$('modal').classList.add('open');const st=settingsFromStorage();$('voiceMode').value=st.mode||'browser';$('apiKey').value=st.key||'';$('voiceName').innerHTML='<option value="marin">Giọng Marin dịu nhẹ</option>'}
function settingsFromStorage(){try{return JSON.parse(localStorage.getItem('beVuiSettings')||'{}')}catch(e){return {}}}
function closeTeacher(){$('modal').classList.remove('open')}
function saveSettings(){localStorage.setItem('beVuiSettings',JSON.stringify({mode:$('voiceMode').value,key:$('apiKey').value.trim(),voice:'marin'}));stopVoice();status('Đã lưu trên thiết bị này. Cô hãy bấm Thử giọng.','ok')}
function testVoice(){speak('Chào bé. Cô mời bé nghe và chơi cùng cô nhé.')}
function browserSpeak(text){speak(text)}
document.querySelectorAll('video').forEach(v=>v.addEventListener('play',stopVoice));
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeTeacher()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTeacher()});

const rules={
 letters:'Bé chạm một thẻ, nhìn chữ và tranh. Cô sẽ đọc mẫu, rồi bé đọc theo nhé.',
 hunt:'Bé nghe cô đọc, rồi chạm đúng chữ trong vườn. Nếu chưa đúng, cô sẽ gợi ý.',
 read:'Bé nhìn chữ và tranh, nghe cô nếu cần. Bấm micro, đọc tên chữ và từ trong tranh.',
 word:'Bé nhìn tranh và từ. Nghe cô hỏi rồi chọn mặt chữ xuất hiện trong từ.',
 flip:'Bé nhìn tranh bí mật. Nghe câu hỏi rồi chọn chữ đúng. Sau đó thẻ sẽ lật ra.',
 count:'Bé chỉ vào từng hình, đếm chậm rồi chạm số đúng.',
 hear:'Bé nghe cô đọc số nào, hãy chạm vào số đó. Bấm nghe lại nếu cần.',
 match:'Bé đếm số đồ vật trong tranh, rồi chọn thẻ số bằng với số lượng.',
 draw:'Bé chọn chữ, vẽ nét ở bất cứ đâu trong khung. Sau đó bấm kiểm tra để nghe cô nhận xét.'
};
function show(id){stopMic();stopSound();document.querySelectorAll('main section').forEach(x=>x.classList.toggle('visible',x.id===id));document.querySelectorAll('.nav .pill').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='draw')requestAnimationFrame(resizeTrace);if(id==='letters')speak(rules.letters);if(id==='play')announceLetterGame(activeLetterGame);if(id==='numbers')announceNumberGame(activeNumberGame);if(id==='draw')speak(rules.draw)}
let activeLetterGame='hunt',activeNumberGame='count';
function showLetterGame(name,button){stopMic();stopSound();activeLetterGame=name;document.querySelectorAll('.letter-panel').forEach(p=>p.classList.toggle('active',p.id==='letterGame-'+name));document.querySelectorAll('#play .game-tab').forEach(b=>b.classList.toggle('active',b===button));announceLetterGame(name)}
function goLetterGame(name){activeLetterGame=name;document.querySelectorAll('.letter-panel').forEach(p=>p.classList.toggle('active',p.id==='letterGame-'+name));document.querySelectorAll('#play .game-tab').forEach(b=>b.classList.toggle('active',b.getAttribute('onclick')?.includes("'"+name+"'")));show('play')}
function showNumberGame(name,button){stopSound();activeNumberGame=name;document.querySelectorAll('.number-panel').forEach(p=>p.classList.toggle('active',p.id==='numberGame-'+name));document.querySelectorAll('#numbers .game-tab').forEach(b=>b.classList.toggle('active',b===button));announceNumberGame(name)}
function announceLetterGame(name){if(name==='hunt')speak(rules.hunt+' '+huntQuestion());else if(name==='read')speak(rules.read);else if(name==='word')speak(rules.word+' '+wordQuestion());else speak(rules.flip+' '+flipQuestion())}
function announceNumberGame(name){if(name==='count')speak(rules.count+' '+countQuestion());else if(name==='hear')speak(rules.hear+' '+numberQuestion());else speak(rules.match+' '+matchQuestion())}

let currentLetter=letters[0];const alphabet=$('alphabet');
letters.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='letter'+(x.vowel?' is-vowel':'');b.setAttribute('aria-label',label(x)+', tranh '+x.word);b.innerHTML='<span class="letter-main">'+x.id+'</span><span class="letter-cap">'+x.upper+'</span><img class="letter-art" alt="" src="'+x.art+'"><span class="letter-word">'+(x.id==='i'?'i trong ':'')+(x.id==='q'?'q trong ':'')+(x.id==='p'?'p như ':'')+(x.id==='i'||x.id==='q'||x.id==='p'?'':x.id+' như ')+x.word+'</span>';b.onclick=()=>setLetter(x.id,b);alphabet.appendChild(b)});
const lessonArt=document.createElement('img');lessonArt.className='lesson-art';lessonArt.id='lessonArt';lessonArt.alt='Tranh minh họa';$('letterDesc').after(lessonArt);
function setLetter(id,tile,silent=false){currentLetter=byLetter[id];$('bigLetter').textContent=id;$('letterTitle').textContent='Chữ '+id+' — '+currentLetter.upper;$('letterDesc').textContent=id==='q'?'Chữ q gọi là cu. Trong tiếng quà, q đi cùng u thành qu, đọc âm quờ.':id==='p'?'Chữ p gọi là pê; âm pờ có trong pin.':wordLine(currentLetter);lessonArt.src=currentLetter.art;lessonArt.alt='Minh họa '+currentLetter.word;document.querySelectorAll('#alphabet .letter').forEach(x=>x.classList.toggle('selected',x===tile));if(!silent)speak('Đây là '+label(currentLetter)+'. '+wordLine(currentLetter)+' Bé đọc cùng cô nào.')}
function speakLetter(){speak('Đây là '+label(currentLetter)+'. '+wordLine(currentLetter)+' Bé đọc cùng cô nào.')}
function speakSound(){const x=currentLetter;if(x.id==='q')speak('Trong tiếng quà, chữ cu đi cùng u tạo qu, đọc âm quờ. Quờ, a, qua, huyền, quà.');else speak('Đây là âm '+soundNames[x.id]+'. '+soundNames[x.id]+' có trong '+x.word+'. Bé nghe và đọc lại nhé.')}
setLetter('a',alphabet.querySelector('.letter'),true);

let huntRound=newRound(letters[0].id);
function huntQuestion(){return 'Cô mời bé tìm '+label(byLetter[huntRound.target])+'.'}
function renderHunt(){const box=$('huntBoard');box.innerHTML='';distinctChoices(huntRound.target,letters.map(x=>x.id),12).forEach(id=>{const b=document.createElement('button');b.className='hunt-letter';b.textContent=id;b.setAttribute('aria-label','Chữ '+id);b.onclick=()=>{const x=byLetter[huntRound.target],ok=answer(huntRound,id,'huntFeedback',n=>'Đúng rồi. Bé tìm thấy '+label(x)+' sau '+n+' lượt. Giỏi lắm!',n=>'Chưa đúng. Bé hãy nghe lại và tìm '+label(x)+'.','huntStats');if(ok)disableAnswers(box)};box.appendChild(b)});$('huntPrompt').textContent='Bé bấm loa để nghe câu hỏi.';renderStats('huntStats',huntRound)}
function startLetterHunt(){speak(rules.hunt+' '+huntQuestion())}
function replayLetterHunt(){speak(huntQuestion()+' Bé chạm đúng chữ cô vừa đọc.')}
function newLetterHunt(){let next;do{next=letters[random(letters.length)].id}while(next===huntRound.target);huntRound=newRound(next);renderHunt();feedback('huntFeedback','listen','Lượt mới. Bé nghe cô đọc nhé.','');startLetterHunt()}
renderHunt();

let readIndex=0,readScore=0,readRound=newRound(letters[0].id),recognition=null,readSession=0;
function stopMic(){readSession++;if(recognition){try{recognition.abort()}catch(e){}recognition=null}document.querySelector('.mic-button').classList.remove('listening');document.querySelector('.mic-button span').textContent='Bé đọc vào micro'}
function renderReadCard(){const x=letters[readIndex];$('readLetter').textContent=x.id;$('readArt').src=x.art;$('readArt').alt='Minh họa '+x.word;$('readWord').textContent=(x.id==='i'?'i trong ':x.id==='q'?'q trong ':x.id+' như ')+x.word;$('readFeedback').dataset.result='listen';$('readFeedback').textContent='Bé nhìn tranh, bấm micro và đọc.';$('micNotice').textContent='Bé đọc tên chữ và từ '+x.word+'.';renderStats('readStats',readRound)}
function nextReadCard(){stopMic();readIndex=(readIndex+1)%letters.length;readRound=newRound(letters[readIndex].id);renderReadCard();speak('Thẻ mới. Bé nhìn tranh '+letters[readIndex].word+', đọc tên chữ và từ nhé.')}
function readWithTeacher(){const x=letters[readIndex];speak('Cô đọc mẫu. '+wordLine(x)+' Bé bấm micro để đọc lại.')}
function exactWords(text){return String(text||'').toLocaleLowerCase('vi-VN').normalize('NFC').replace(/[.,!?“”]/g,' ').replace(/\s+/g,' ').trim()}
function heardName(text,x){const t=' '+exactWords(text)+' ';const names=x.id==='q'?['cu','q']:x.id==='ă'?['á','ă']:x.id==='â'?['ớ','â']:[x.name,x.id];return names.some(n=>t.includes(' '+n+' '))}
function evaluateRead(transcript,session){if(session!==readSession||readRound.solved)return;const x=letters[readIndex],t=exactWords(transcript),hasWord=t.includes(exactWords(x.word)),hasName=heardName(transcript,x);readRound.attempts++;if(hasWord&&hasName){markDone(readRound);readScore++;$('readScore').textContent=readScore;feedback('readFeedback','correct','Cô nghe được tên chữ và từ '+x.word+'. Bé đã đọc đúng sau '+readRound.attempts+' lượt!','Giỏi lắm. Cô đã nghe tên chữ và từ '+x.word+'.');}else{feedback('readFeedback','retry','Cô nghe: “'+transcript+'”. Cô chưa nghe đủ tên chữ và từ '+x.word+'. Bé thử lại nhé.','Cô chưa nghe rõ cả tên chữ và từ. Bé thử đọc lại chậm hơn nhé.')}renderStats('readStats',readRound)}
function startReadMic(){if(readRound.solved){feedback('readFeedback','listen','Bé đã hoàn thành thẻ này. Bấm Đổi chữ khác để tiếp tục.','');return}if(recognition)return;const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){feedback('readFeedback','retry','Thiết bị chưa hỗ trợ nhận giọng nói. Cô có thể dùng Chrome hoặc Edge để bé thử lại.','Thiết bị chưa hỗ trợ micro nhận lời. Bé có thể nghe cô đọc mẫu.');return}stopSound();const session=++readSession,rec=new Rec();recognition=rec;rec.lang='vi-VN';rec.interimResults=false;rec.maxAlternatives=3;document.querySelector('.mic-button').classList.add('listening');document.querySelector('.mic-button span').textContent='Cô đang nghe bé…';$('micNotice').textContent='Bé đọc tên chữ và từ '+letters[readIndex].word+'.';let received=false;rec.onresult=e=>{if(session!==readSession)return;received=true;evaluateRead(e.results[0][0].transcript,session)};rec.onerror=e=>{if(session!==readSession)return;received=true;feedback('readFeedback','retry',e.error==='not-allowed'?'Cô hãy cho phép dùng micro rồi thử lại.':'Cô chưa nghe rõ. Bé nói gần micro và thử lại nhé.','Cô chưa nghe rõ. Bé thử đọc gần micro và chậm hơn nhé.')};rec.onend=()=>{if(session!==readSession)return;recognition=null;document.querySelector('.mic-button').classList.remove('listening');document.querySelector('.mic-button span').textContent='Bé đọc vào micro';if(!received)feedback('readFeedback','retry','Cô chưa nghe được tiếng của bé. Bé bấm micro và đọc lại nhé.','Cô chưa nghe được. Bé thử lại nhé.')};try{rec.start()}catch(e){recognition=null;feedback('readFeedback','retry','Micro đang bận. Bé thử lại sau một chút nhé.','Micro đang bận. Bé thử lại nhé.')}}
renderReadCard();

let wordIndex=0,wordRound=newRound(letters[0].id);
function wordQuestion(){const x=letters[wordIndex];return 'Trong từ '+x.word+', bé tìm '+label(x)+' nhé.'}
function renderWord(){const x=letters[wordIndex];$('wordArt').src=x.art;$('wordArt').alt='Minh họa '+x.word;$('quest').textContent='Trong từ '+x.word.toUpperCase()+', bé tìm chữ nào?';$('choices').innerHTML='';distinctChoices(x.id,letters.map(v=>v.id)).forEach(id=>{const b=document.createElement('button');b.className='choice';b.textContent=id;b.setAttribute('aria-label','Chữ '+id);b.onclick=()=>{const ok=answer(wordRound,id,'feedback',n=>'Đúng rồi. '+label(x)+' có trong từ '+x.word+'. Bé tìm sau '+n+' lượt.',n=>'Chưa đúng. Bé nhìn lại từ '+x.word+' và tìm '+label(x)+'.','wordStats');if(ok)disableAnswers($('choices'))};$('choices').appendChild(b)});renderStats('wordStats',wordRound)}
function newQuest(){wordIndex=(wordIndex+1)%letters.length;wordRound=newRound(letters[wordIndex].id);renderWord();feedback('feedback','listen','Câu mới. Bé nhìn tranh và nghe cô hỏi.','');speak(rules.word+' '+wordQuestion())}
function hearWordQuest(){speak(wordQuestion())}
renderWord();

let flashIndex=14,flipRound=newRound(letters[flashIndex].id);
function flipQuestion(){return 'Đây là tranh '+letters[flashIndex].word+'. Tranh này gợi cho bé chữ gì?'}
function renderFlip(){const x=letters[flashIndex];$('flash').classList.remove('flipped');$('flashFront').innerHTML='<img src="'+x.art+'" alt="Tranh '+x.word+'"><span>Nhìn tranh và nghe câu hỏi</span>';$('flashBack').innerHTML='<span class="flash-letter">'+x.id+'</span><img src="'+x.art+'" alt=""><span>'+wordLine(x)+'</span>';$('flipChoices').innerHTML='';distinctChoices(x.id,letters.map(v=>v.id)).forEach(id=>{const b=document.createElement('button');b.textContent=id;b.setAttribute('aria-label','Chữ '+id);b.onclick=()=>{const ok=answer(flipRound,id,'flipFeedback',n=>'Đúng rồi. Đây là '+label(x)+'. '+wordLine(x)+' Bé đoán sau '+n+' lượt.',n=>'Chưa đúng. Nhìn tranh '+x.word+' và nghe lại câu hỏi nhé.','flipStats');if(ok){$('flash').classList.add('flipped');disableAnswers($('flipChoices'))}};$('flipChoices').appendChild(b)});renderStats('flipStats',flipRound)}
function flip(){if(flipRound.solved){$('flash').classList.add('flipped');speak(wordLine(letters[flashIndex]))}else speak(flipQuestion())}
$('flash').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}});
function nextCard(){flashIndex=(flashIndex+1)%letters.length;flipRound=newRound(letters[flashIndex].id);renderFlip();feedback('flipFeedback','listen','Thẻ mới. Bé nhìn tranh và chọn chữ.','');speak(rules.flip+' '+flipQuestion())}
function askFlip(){speak(flipQuestion())}
renderFlip();

const numberRow=$('numberRow');for(let n=1;n<=10;n++){const b=document.createElement('button');b.className='num';b.textContent=n;b.setAttribute('aria-label','Số '+numberWords[n]);b.onclick=()=>{numberRow.querySelectorAll('.num').forEach(x=>x.classList.remove('active'));b.classList.add('active');speak('Đây là số '+numberWords[n]+'. Bé đọc cùng cô nào.')};numberRow.appendChild(b)}
function renderObjects(id,item,total){const box=$(id);box.innerHTML='';for(let i=0;i<total;i++){const img=document.createElement('img');img.src=item.asset;img.alt=item.name+' thứ '+(i+1);img.loading='eager';box.appendChild(img)}}
let count=3,countItem=countItems[0],countRound=newRound(3);
function countQuestion(){return 'Có mấy '+countItem.name+'? Bé đếm rồi chọn số.'}
function numberChoices(round,boxId,feedbackId,item,statsId){const box=$(boxId);box.innerHTML='';distinctChoices(round.target,[1,2,3,4,5,6,7,8,9,10]).forEach(n=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-label','Số '+n);b.onclick=()=>{const ok=answer(round,n,feedbackId,k=>'Đúng rồi. Có '+numberWords[round.target]+' '+item.name+'. Bé làm được sau '+k+' lượt.',k=>'Chưa đúng. Bé chỉ vào từng '+item.name+' và đếm lại nhé.',statsId);if(ok)disableAnswers(box)};box.appendChild(b)});renderStats(statsId,round)}
function renderCount(){renderObjects('countVisual',countItem,count);$('countPrompt').textContent='Có mấy '+countItem.name+'?';numberChoices(countRound,'numChoices','numFeedback',countItem,'countStats')}
function newCount(){count=random(10)+1;countItem=countItems[random(countItems.length)];countRound=newRound(count);renderCount();feedback('numFeedback','listen','Lượt mới. Bé đếm và chọn số.','');speak(rules.count+' '+countQuestion())}
function hearCount(){speak(countQuestion())}
renderCount();

let numberRound=newRound(1);
function numberQuestion(){return 'Cô mời bé tìm số '+numberWords[numberRound.target]+'.'}
function renderNumberHunt(){const box=$('numberHunt');box.innerHTML='';shuffle([1,2,3,4,5,6,7,8,9,10]).forEach(n=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-label','Số '+numberWords[n]);b.onclick=()=>{const ok=answer(numberRound,n,'numberHuntFeedback',k=>'Đúng rồi. Đây là số '+numberWords[numberRound.target]+'. Bé tìm sau '+k+' lượt.',k=>'Chưa đúng. Bé nghe số '+numberWords[numberRound.target]+' và tìm lại nhé.','numberStats');if(ok)disableAnswers(box)};box.appendChild(b)});$('numberHuntPrompt').textContent='Bé bấm loa để nghe câu hỏi.';renderStats('numberStats',numberRound)}
function startNumberHunt(){speak(rules.hear+' '+numberQuestion())}
function replayNumberHunt(){speak(numberQuestion())}
function newNumberHunt(){let next;do{next=random(10)+1}while(next===numberRound.target);numberRound=newRound(next);renderNumberHunt();feedback('numberHuntFeedback','listen','Lượt mới. Bé nghe cô đọc nhé.','');startNumberHunt()}
renderNumberHunt();

let quantity=4,quantityItem=countItems[1],quantityRound=newRound(4);
function matchQuestion(){return 'Có mấy '+quantityItem.name+'? Bé đếm và chọn số tương ứng.'}
function renderQuantity(){renderObjects('quantityCard',quantityItem,quantity);numberChoices(quantityRound,'quantityChoices','quantityFeedback',quantityItem,'quantityStats')}
function nextQuantityGame(){quantity=random(10)+1;quantityItem=countItems[random(countItems.length)];quantityRound=newRound(quantity);renderQuantity();feedback('quantityFeedback','listen','Lượt mới. Bé đếm và ghép số.','');speak(rules.match+' '+matchQuestion())}
function hearQuantity(){speak(matchQuestion())}
renderQuantity();

/* Tập nét: nhận xét theo mức giống mẫu, không giả vờ xác nhận chữ viết tuyệt đối. */
const canvas=$('canvas'),ctx=canvas.getContext('2d');let traceLetter='a',traceRound=newRound('a'),drawing=false,inkLength=0,lastPoint=null;
function resizeTrace(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const ratio=devicePixelRatio||1;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineWidth=12;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#e96782';inkLength=0;lastPoint=null}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);drawing=true;const p=canvasPoint(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();lastPoint=p});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=canvasPoint(e);inkLength+=Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y);ctx.lineTo(p.x,p.y);ctx.stroke();lastPoint=p});
canvas.addEventListener('pointerup',()=>{drawing=false;lastPoint=null});canvas.addEventListener('pointercancel',()=>{drawing=false;lastPoint=null});
function clearCanvas(){ctx.clearRect(0,0,canvas.width,canvas.height);inkLength=0;drawing=false;lastPoint=null;traceRound=newRound(traceLetter);$('traceFeedback').dataset.result='listen';$('traceFeedback').textContent='Bé có thể vẽ ở bất cứ đâu trong khung.';renderStats('traceStats',traceRound)}
function renderTracePicker(){const box=$('traceLetters');box.innerHTML='';letters.forEach(x=>{const b=document.createElement('button');b.className='trace-choice'+(x.id===traceLetter?' active':'');b.textContent=x.id;b.setAttribute('aria-label','Tập nét chữ '+x.id);b.onclick=()=>setTraceLetter(x.id);box.appendChild(b)})}
function setTraceLetter(id){traceLetter=id;$('traceGuide').textContent=id;$('traceInstruction').textContent='Bé vẽ chữ '+id+' ở bất cứ chỗ nào trong khung.';clearCanvas();renderTracePicker();speak('Bé tập nét '+label(byLetter[id])+'. Bé vẽ ở bất cứ đâu trong khung rồi bấm kiểm tra nhé.')}
function playTraceGuide(){speak(rules.draw+' Mẫu là '+label(byLetter[traceLetter])+'.')}
function normalizedMask(source){const side=80,out=document.createElement('canvas');out.width=out.height=side;const c=out.getContext('2d',{willReadFrequently:true});const data=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,source.width,source.height),w=source.width,h=source.height;let x1=w,y1=h,x2=0,y2=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(data.data[(y*w+x)*4+3]>50){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y)}}if(x1>x2)return null;c.drawImage(source,x1,y1,Math.max(1,x2-x1+1),Math.max(1,y2-y1+1),9,9,62,62);const outData=c.getImageData(0,0,side,side).data;return Array.from({length:side*side},(_,i)=>outData[i*4+3]>75)}
function traceSimilarity(){const target=document.createElement('canvas');target.width=target.height=160;const c=target.getContext('2d');c.font='700 120px Andika, "Comic Sans MS", cursive';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#333';c.fillText(traceLetter,80,86);const ink=normalizedMask(canvas),sample=normalizedMask(target);if(!ink||!sample)return 0;const side=80;function near(mask,x,y){for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<side&&yy>=0&&yy<side&&dx*dx+dy*dy<=25&&mask[yy*side+xx])return true}return false}let a=0,b=0,hitA=0,hitB=0;for(let y=0;y<side;y++)for(let x=0;x<side;x++){const i=y*side+x;if(ink[i]){a++;if(near(sample,x,y))hitA++}if(sample[i]){b++;if(near(ink,x,y))hitB++}}return Math.min(hitA/Math.max(a,1),hitB/Math.max(b,1))}
function checkTrace(){traceRound.attempts++;if(inkLength<70){feedback('traceFeedback','retry','Bé hãy vẽ thêm nét trong khung rồi kiểm tra lại nhé.','Bé hãy vẽ thêm một chút rồi kiểm tra lại nhé.');renderStats('traceStats',traceRound);return}const score=traceSimilarity();if(score>=.42){markDone(traceRound);feedback('traceFeedback','correct','Nét bé vẽ khá giống mẫu '+traceLetter+'. Cô tặng bé một sao. Cô hãy cùng bé nhìn lại nét chữ nhé.','Bé đã vẽ khá giống mẫu. Cô tặng bé một ngôi sao.');}else feedback('traceFeedback','retry','Bé đã tập một lượt. Nét còn khác mẫu '+traceLetter+'; bé nhìn mẫu và thử lại nhé.','Bé đã tập một lượt. Mình nhìn mẫu, rồi thử lại nhé.');renderStats('traceStats',traceRound)}
renderTracePicker();$('traceGuide').textContent='a';$('traceInstruction').textContent='Bé vẽ chữ a ở bất cứ chỗ nào trong khung.';renderStats('traceStats',traceRound);

/* Nút hỏi và nghe lại luôn nhắc cùng một lượt, không đổi đáp án. */
window.show=show;window.showLetterGame=showLetterGame;window.showNumberGame=showNumberGame;
window.goLetterGame=goLetterGame;
window.setLetter=setLetter;window.speakLetter=speakLetter;window.speakSound=speakSound;window.startLetterHunt=startLetterHunt;window.replayLetterHunt=replayLetterHunt;window.newLetterHunt=newLetterHunt;
window.nextReadCard=nextReadCard;window.readWithTeacher=readWithTeacher;window.startReadMic=startReadMic;
window.newQuest=newQuest;window.hearWordQuest=hearWordQuest;window.flip=flip;window.nextCard=nextCard;window.askFlip=askFlip;
window.newCount=newCount;window.hearCount=hearCount;window.startNumberHunt=startNumberHunt;window.replayNumberHunt=replayNumberHunt;window.newNumberHunt=newNumberHunt;
window.nextQuantityGame=nextQuantityGame;window.hearQuantity=hearQuantity;window.setTraceLetter=setTraceLetter;window.playTraceGuide=playTraceGuide;window.clearCanvas=clearCanvas;window.checkTrace=checkTrace;
window.openTeacher=openTeacher;window.closeTeacher=closeTeacher;window.saveSettings=saveSettings;window.testVoice=testVoice;window.browserSpeak=browserSpeak;window.homeMission=()=>speak('Nhiệm vụ hôm nay: bé chọn một chữ, nghe cô đọc, chơi một trò và nhận ngôi sao. Bé bắt đầu nhé!');
