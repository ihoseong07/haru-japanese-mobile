import {lessons,feedback} from './lessons.mjs';
import {koreanPronunciation,vocabularyPronunciation} from './pronunciation.mjs?v=20261124-3';
const $=id=>document.getElementById(id);
let worker,seq=0,busy=false,free=false,topic='자기소개',index=0,started=0,clock,lastReply,ctx,source,stream,processor,capture=[],recording=false,recordTimer,inputNode,silent;
const pending=new Map(),history=[],session=[];
function error(text){$('error').textContent=text;$('error').hidden=!text;}
function status(text,percent){$('statusBox').hidden=!text;$('statusText').textContent=text||'';$('progress').hidden=!Number.isFinite(percent);if(Number.isFinite(percent))$('progress').value=percent;}
function lock(value){busy=value;for(const id of ['mic','repeat','hint','sendRecognized','start','basic'])$(id).disabled=value;$('textForm').querySelector('button').disabled=value;}
function ensureWorker(){
 if(worker)return;worker=new Worker(new URL('./engine.mjs?v=20261124-4',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{if(data.status){status(data.status,data.progress);return;}const task=pending.get(data.id);if(task){pending.delete(data.id);clearTimeout(task.timer);worker.terminate();worker=null;try{localStorage.removeItem('haru.activeTask');}catch{}data.error?task.reject(new Error(data.error)):task.resolve(data.result);}};
 worker.onerror=event=>{error('이 브라우저에서 음성 엔진을 열지 못했어요. 최신 Safari 또는 Chrome으로 열어주세요.');for(const task of pending.values()){clearTimeout(task.timer);task.reject(new Error(event.message||'음성 엔진 오류'));}pending.clear();worker.terminate();worker=null;};
}
function rpc(mode,data={}){ensureWorker();return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);worker?.terminate();worker=null;reject(new Error('준비가 오래 걸리고 있어요. Wi-Fi와 여유 메모리를 확인한 뒤 다시 시도하세요.'));},600000);pending.set(id,{resolve,reject,timer});try{localStorage.setItem('haru.activeTask',mode);}catch{}worker.postMessage({id,mode,...data});});}
async function audioContext(){ctx ||= new (window.AudioContext||window.webkitAudioContext)();if(ctx.state!=='running')await ctx.resume();return ctx;}
function field(parent,className,text){if(!text)return;const element=document.createElement('p');element.className=className;element.textContent=text;parent.append(element);}
function addUser(text){const card=document.createElement('article');card.className='bubble user';field(card,'speaker','나');field(card,'meaning',text);$('messages').append(card);card.scrollIntoView({block:'nearest',behavior:'smooth'});}
function addTeacher(reply){const card=document.createElement('article');card.className='bubble';field(card,'speaker','はる · 하루');field(card,'japanese',reply.japanese);const hangul=reply.koreanReading||koreanPronunciation(reply.reading,reply.japanese);if(hangul)field(card,'korean-reading','한글 발음 · '+hangul);field(card,'reading',reply.reading);field(card,'reading',reply.romanization);field(card,'meaning',reply.korean);if(reply.correction){const correctionReading=koreanPronunciation('',reply.correction);field(card,'correction','다시 말해보기: '+reply.correction+(correctionReading?'\n한글 발음: '+correctionReading:''));}field(card,'vocabulary',vocabularyPronunciation(reply.vocabulary));$('messages').append(card);card.scrollIntoView({block:'nearest',behavior:'smooth'});lastReply=reply;}
async function speak(text){
 if(source){source.stop();source=null;}
 status('하루가 일본어를 읽어줄게요…');const result=await rpc('tts',{text});const audio=await audioContext();
 const buffer=audio.createBuffer(1,result.samples.length,result.rate);buffer.copyToChannel(new Float32Array(result.samples),0);
 await new Promise((resolve,reject)=>{source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);source.onended=()=>{source=null;resolve();};source.start();});status('');
}
function save(entry){entry.koreanReading=koreanPronunciation(entry.reading,entry.japanese);session.push(entry);try{const old=JSON.parse(localStorage.getItem('haru.records')||'[]');localStorage.setItem('haru.records',JSON.stringify([...old,entry].slice(-100)));}catch{error('기기 저장 공간이 부족해 기록을 저장하지 못했어요. 대화는 계속할 수 있어요.');}}
async function teacher(reply,play=true){addTeacher(reply);if(play)try{await speak(reply.japanese);}catch(e){error('음성 재생을 준비하지 못했어요. 화면의 문장을 읽거나 다시 듣기를 눌러주세요. '+e.message);status('');}}
function current(){return lessons[topic][index];}
async function askBasic(){const lesson=current();await teacher({japanese:lesson[0],reading:lesson[1],korean:lesson[2],vocabulary:lesson[3]});}
async function begin(ai){
 if(busy)return;error('');lock(true);free=ai;
 try{
   await audioContext();$('welcome').hidden=true;$('lesson').hidden=false;$('controls').hidden=false;$('topicLabel').textContent=topic+(free?' · 자유 회화':' · 기초 연습');
   // Load only the engine needed for the current operation, in a disposable worker.
   started=Date.now();clock=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} / 10:00`;if(seconds===600)error('오늘 10분 달성! 계속 연습하거나 마치기를 누르세요.');},1000);
   const lesson=current();const reply={japanese:lesson[0],reading:lesson[1],korean:lesson[2],vocabulary:lesson[3]};history.push({role:'assistant',content:JSON.stringify(reply)});await teacher(reply);
 }catch(e){error(e.message+' 예문 연습은 모델 준비 없이 시작할 수 있어요.');$('welcome').hidden=false;$('lesson').hidden=true;$('controls').hidden=true;status('');}
 finally{lock(false);}
}
async function send(text){
 if(busy||!text.trim())return;error('');lock(true);$('recognition').hidden=true;addUser(text);
 try{
   if(free){status('하루가 답변을 준비하고 있어요…');const next=[...history,{role:'user',content:text}];const reply=await rpc('tutor',{history:next});Object.assign(reply,await rpc('analyze',{text:reply.japanese}));history.push({role:'user',content:text},{role:'assistant',content:JSON.stringify(reply)});if(history.length>9)history.splice(0,history.length-9);save({date:new Date().toISOString(),user:text,...reply});await teacher(reply);}
   else{const lesson=current();const reply={japanese:lesson[4],reading:lesson[5],korean:feedback(text,lesson)+'\n예시 문장을 소리 내어 따라 해보세요.',vocabulary:lesson[3]};save({date:new Date().toISOString(),user:text,...reply});await teacher(reply);index=(index+1)%lessons[topic].length;await askBasic();}
 }catch(e){error(e.message);}finally{status('');lock(false);}
}
async function stopRecording(){
 if(!recording)return;recording=false;clearTimeout(recordTimer);$('mic').classList.remove('recording');$('mic').querySelector('span').textContent='말하기';$('mic').setAttribute('aria-label','마이크 녹음 시작');
 processor.disconnect();processor.onaudioprocess=null;inputNode?.disconnect();silent?.disconnect();stream.getTracks().forEach(track=>track.stop());$('micHelp').textContent='버튼을 누르고 한국어 또는 일본어로 말하세요.';lock(true);
 try{
   const length=capture.reduce((sum,x)=>sum+x.length,0);if(length<ctx.sampleRate*.3)throw new Error('조금 더 길게 말해보세요.');
   const original=new Float32Array(length);let offset=0;for(const part of capture){original.set(part,offset);offset+=part.length;}capture=[];
   let energy=0;for(const value of original)energy+=value*value;if(Math.sqrt(energy/length)<.002)throw new Error('소리가 너무 작아요. 마이크를 확인하고 다시 말해보세요.');
   const offline=new OfflineAudioContext(1,Math.ceil(length*16000/ctx.sampleRate),16000),input=offline.createBuffer(1,length,ctx.sampleRate);input.copyToChannel(original,0);const inputSource=offline.createBufferSource();inputSource.buffer=input;inputSource.connect(offline.destination);inputSource.start();const rendered=await offline.startRendering();
   status('말을 인식하고 있어요…');const result=await rpc('stt',{audio:rendered.getChannelData(0)});$('recognized').value=result.text;$('recognition').hidden=false;$('recognition').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){error(e.message);}finally{lock(false);status('');}
}
async function record(){
 if(recording){await stopRecording();return;}if(busy)return;error('');
 if(!isSecureContext){error('마이크는 HTTPS 링크에서 사용할 수 있어요. 글자 입력은 계속 사용할 수 있어요.');return;}
 try{
   await audioContext();if(source){source.stop();source=null;}
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
   inputNode=ctx.createMediaStreamSource(stream);processor=ctx.createScriptProcessor(4096,1,1);capture=[];processor.onaudioprocess=event=>{if(recording)capture.push(event.inputBuffer.getChannelData(0).slice());};
   silent=ctx.createGain();silent.gain.value=0;inputNode.connect(processor);processor.connect(silent);silent.connect(ctx.destination);recording=true;
   $('mic').classList.add('recording');$('mic').querySelector('span').textContent='말하기 끝';$('mic').setAttribute('aria-label','녹음 종료');$('micHelp').textContent='● 녹음 중 — 말을 마치면 버튼을 한 번 더 누르세요.';recordTimer=setTimeout(stopRecording,20000);
 }catch(e){stream?.getTracks().forEach(track=>track.stop());error(e.name==='NotAllowedError'?'마이크 사용이 허용되지 않았어요. 브라우저의 마이크 권한을 확인하거나 글자로 대답하세요.':'마이크를 열지 못했어요. '+e.message);}
}
$('start').onclick=()=>begin(true);$('basic').onclick=()=>begin(false);$('mic').onclick=record;
$('repeat').onclick=async()=>{if(!lastReply||busy)return;error('');lock(true);try{await audioContext();await speak(lastReply.japanese);}catch(e){error(e.message);}finally{status('');lock(false);}};
$('hint').onclick=async()=>{if(free)send('/힌트 지금 질문에 쓸 쉬운 단어와 짧은 일본어 예문을 알려주세요.');else{lock(true);try{const l=current();await teacher({japanese:l[4],reading:l[5],korean:'이 문장을 자기 상황에 맞게 바꿔보세요.',vocabulary:l[3]});}finally{lock(false);}}};
$('textForm').onsubmit=event=>{event.preventDefault();const input=$('textInput');const text=input.value.trim();if(text&&!busy){audioContext().catch(()=>{});input.value='';send(text);}};
$('sendRecognized').onclick=()=>send($('recognized').value.trim());$('rerecord').onclick=()=>{$('recognition').hidden=true;record();};
document.querySelectorAll('[data-topic]').forEach(button=>button.onclick=()=>{topic=button.dataset.topic;document.querySelectorAll('[data-topic]').forEach(other=>{other.classList.toggle('selected',other===button);other.setAttribute('aria-pressed',String(other===button));});});
$('review').onclick=()=>{const list=$('reviewList');list.replaceChildren();let records=[];try{records=JSON.parse(localStorage.getItem('haru.records')||'[]');}catch{}if(!records.length)field(list,'meaning','まだこれから。最初の一言から始めましょう。\nまだ記録はありません。처음 한마디를 연습해보세요.');for(const entry of records.slice(-20).reverse()){const div=document.createElement('article');div.className='review-item';const hangul=entry.koreanReading||koreanPronunciation(entry.reading,entry.japanese);div.textContent=`${entry.user}\n${entry.translation||entry.correction||entry.japanese}\n${hangul?'한글 발음: '+hangul+'\n':''}${entry.reading||''}\n${entry.korean||''}`;list.append(div);}$('reviewDialog').showModal();};
$('closeReview').onclick=()=>$('reviewDialog').close();
$('export').onclick=()=>{const blob=new Blob([localStorage.getItem('haru.records')||'[]'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='haru-japanese-records.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('finish').onclick=()=>{if(recording){recording=false;stream?.getTracks().forEach(track=>track.stop());processor?.disconnect();inputNode?.disconnect();silent?.disconnect();clearTimeout(recordTimer);}if(source){source.stop();source=null;}worker?.terminate();worker=null;for(const task of pending.values()){clearTimeout(task.timer);task.reject(new Error('학습을 마쳤어요.'));}pending.clear();clearInterval(clock);history.length=0;index=0;lock(false);status('');$('controls').hidden=true;$('recognition').hidden=true;$('lesson').hidden=true;$('welcome').hidden=false;$('messages').replaceChildren();error('おつかれさまでした！ 오늘도 수고했어요. 복습에서 연습한 문장을 다시 볼 수 있어요.');};
if('serviceWorker'in navigator&&!['127.0.0.1','localhost'].includes(location.hostname))navigator.serviceWorker.register('./sw.js').catch(()=>{});

try{if(localStorage.getItem('haru.activeTask')){error('이전 준비가 중단됐어요. 메모리를 줄인 버전으로 다시 시작하세요. 계속 꺼지면 예문 연습과 글자 입력부터 이용해 주세요.');localStorage.removeItem('haru.activeTask');}}catch{}
