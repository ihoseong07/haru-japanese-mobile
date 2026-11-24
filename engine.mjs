import {Wllama} from './assets/wllama4/package/esm/index.js';
import {pipeline,env,Tensor} from './assets/transformers.js';
import {configure,synthesizeAsync,g2pAsync,runFrontendAsync} from './assets/jtalk/package/dist/browser.js?v=20261124-2';
import {cleanReading,romanize,vocabulary,koreanTranslationInput,beginnerCorrection,introductionReply,similarCorrection} from './japanese.mjs';
const base=new URL('./',import.meta.url),asset=path=>new URL('assets/'+path,base).href;
env.allowLocalModels=false;env.allowRemoteModels=true;env.useBrowserCache=true;
env.backends.onnx.wasm.wasmPaths=asset('ort/');env.backends.onnx.wasm.numThreads=1;
let llm,asr,voiceReady;
const tell=(text,progress)=>postMessage({status:text,progress});
async function voice(){voiceReady ||= configure({dicUrl:asset('dictionary'),voiceUrl:asset('voice.htsvoice')});try{await voiceReady;}catch(e){voiceReady=null;throw e;}}
async function languageModel(){
 if(llm)return llm;
 tell('자유 회화 모델 준비 중…');
 const model=new Wllama({default:asset('wllama4/package/esm/wasm/wllama.wasm')},{logger:{debug(){},log(){},warn(){},error:console.error}});
 model.setCompat({wasm:asset('compat/package/wasm/wllama.wasm')});
 await model.loadModelFromUrl('https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf',{
   n_ctx:1536,n_threads:1,n_parallel:1,reasoning:false,default_template_kwargs:{enable_thinking:false},
   progressCallback:({loaded,total})=>tell('자유 회화 모델을 내려받고 있어요',total?loaded/total*100:undefined)
 });llm=model;return llm;
}
async function speechModel(){
 if(asr)return asr;tell('한국어·일본어 음성 인식을 준비해요');
 asr=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{dtype:'q8',device:'wasm',progress_callback:event=>{if(event.status==='progress')tell('음성 인식 모델을 내려받고 있어요',event.progress);}});return asr;
}
async function generate(messages,fields){
 const model=await languageModel();tell('하루가 답변을 준비하고 있어요…');
 const schema={type:'object',properties:Object.fromEntries(fields.map(key=>[key,{type:'string'}])),required:fields,additionalProperties:false};
 const result=await model.createChatCompletion({messages,temperature:0.15,max_tokens:230,chat_template_kwargs:{enable_thinking:false},cache_prompt:true,response_format:{type:'json_schema',json_schema:{name:'reply',strict:true,schema}}});
 return JSON.parse(result.choices[0].message.content);
}
async function analyze(text){await voice();const kana=cleanReading(await g2pAsync(text,{kana:true}));return {reading:kana,romanization:romanize(kana),vocabulary:vocabulary(await runFrontendAsync(text))};}
const common=new Map([
 ['오늘회사에서일했어','今日は会社で働きました。'],['오늘회사에서일했어요','今日は会社で働きました。'],['커피주세요','コーヒーをください。'],['따뜻한커피한잔주세요','温かいコーヒーを一杯ください。'],['차가운커피주세요','アイスコーヒーをください。'],['빵을먹었어','パンを食べました。'],['빵을먹었어요','パンを食べました。'],['한국에서왔어요','韓国から来ました。'],['한국에서왔어','韓国から来ました。'],['취미는여행이에요','趣味は旅行です。'],['오사카에갔어요','大阪に行きました。'],['물을주세요','お水をください。'],['물주세요','お水をください。'],['두명이에요','二人です。'],['맛있어요','おいしいです。'],['주말에는집에서쉬고싶어요','週末は家で休みたいです。']
]);
async function tutor(history){
 const input=history.at(-1)?.content||'',korean=koreanTranslationInput(history),known=!korean&&beginnerCorrection(input),intro=!korean&&introductionReply(input);
 let japanese,correction='',meaning;
 if(korean){
   japanese=common.get(korean.replace(/[\s.!?。？！]/g,''));
   if(!japanese)japanese=(await generate([{role:'system',content:'Translate Korean to simple polite Japanese. Preserve meaning. Return the Japanese sentence only in translation. Example: 오늘 회사에서 일했어 -> 今日は会社で働きました。'},{role:'user',content:korean}],['translation'])).translation;
   meaning=`뜻: ${korean}\n듣고 일본어로 따라 말해보세요.`;
 }else if(known){japanese=known.japanese;correction=japanese;meaning=known.explanation;}
 else if(intro){japanese=intro.japanese;meaning=intro.korean;}
 else{
   const reply=await generate([{role:'system',content:'You are Haru, a friendly Japanese tutor for a Korean beginner. Reply in easy polite JAPANESE, 1-2 short sentences. React to the student and ask ONE daily-life question. Correct only a real grammar error, then invite repetition. Do not invent errors or grade pronunciation. japanese=Japanese reply; correction=corrected Japanese or empty string. /no_think'},...history.slice(-3)],['japanese','correction']);
   japanese=reply.japanese;correction=similarCorrection(input,reply.correction);
   if(!correction&&!/[?？]|か[。！]?$/.test(japanese)&&!input.startsWith('/'))japanese+=' 今日は何をしましたか？';
   meaning=(await generate([{role:'system',content:'Translate Japanese into Korean accurately. Preserve tense and objects. Example: 昨日、パンを食べました。 -> 어제 빵을 먹었어요. Return only Korean in translation.'},{role:'user',content:japanese}],['translation'])).translation;
 }
 if(!japanese?.trim()||/[가-힣]/.test(japanese))throw new Error('일본어 표현을 만들지 못했어요. 조금 짧게 다시 말해보세요.');
 const details=await analyze(japanese);
 return {japanese:japanese+(korean?' 日本語で言ってみましょう。':known?' もう一度言ってみましょう。':''),...details,korean:meaning,correction,translation:korean?japanese:''};
}
async function run(task){
 if(task.mode==='prepare'){await voice();await languageModel();await speechModel();return {ready:true};}
 if(task.mode==='tts'){await voice();const result=await synthesizeAsync(task.text,{speed:0.85});return {samples:result.pcm,rate:result.sampleRate};}
 if(task.mode==='analyze')return analyze(task.text);
 if(task.mode==='tutor')return tutor(task.history);
 if(task.mode==='stt'){
   const model=await speechModel();tell('말을 듣고 있어요…');
   const audio=new Float32Array(task.audio),features=await model.processor(audio);
   const first=await model.model({...features,decoder_input_ids:new Tensor('int64',BigInt64Array.from([50258n]),[1,1])});
   const ids=model.model.generation_config.lang_to_id,logits=first.logits.data,offset=logits.length-first.logits.dims.at(-1);
   const language=logits[offset+ids['<|ko|>']]>logits[offset+ids['<|ja|>']]?'korean':'japanese';
   const output=await model(audio,{language,task:'transcribe',chunk_length_s:25,stride_length_s:3});
   if(!output.text?.trim())throw new Error('잘 듣지 못했어요. 조금 더 가까이서 다시 말해보세요.');return {text:output.text.trim()};
 }
 throw new Error('지원하지 않는 요청입니다.');
}
let queue=Promise.resolve();
self.onmessage=event=>{const task=event.data;queue=queue.then(async()=>{try{const result=await run(task);postMessage({id:task.id,result});}catch(e){postMessage({id:task.id,error:e.message});}});};
