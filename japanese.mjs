export const hiragana=text=>text.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
export const cleanReading=text=>hiragana(text).replace(/[’‘'ˈ]/g,'');
const rows=[['あいうえお','a i u e o'],['かきくけこ','ka ki ku ke ko'],['がぎぐげご','ga gi gu ge go'],['さしすせそ','sa shi su se so'],['ざじずぜぞ','za ji zu ze zo'],['たちつてと','ta chi tsu te to'],['だぢづでど','da ji zu de do'],['なにぬねの','na ni nu ne no'],['はひふへほ','ha hi fu he ho'],['ばびぶべぼ','ba bi bu be bo'],['ぱぴぷぺぽ','pa pi pu pe po'],['まみむめも','ma mi mu me mo'],['やゆよ','ya yu yo'],['らりるれろ','ra ri ru re ro'],['わをん','wa o n'],['ぁぃぅぇぉ','a i u e o'],['ゔ','vu']];
const map=Object.fromEntries(rows.flatMap(([kana,latin])=>[...kana].map((k,i)=>[k,latin.split(' ')[i]])));
const combos={き:'ky',ぎ:'gy',し:'sh',じ:'j',ち:'ch',ぢ:'j',に:'ny',ひ:'hy',び:'by',ぴ:'py',み:'my',り:'ry'};
export function romanize(kana){
  const text=hiragana(kana);let out='';
  for(let i=0;i<text.length;i++){
    const c=text[i],next=text[i+1];
    if(c==='っ'){const start=map[next]||'';out+=start.startsWith('ch')?'t':/^[bcdfghjklmpqrstvwxyz]/.test(start)?start[0]:'';continue;}
    if(combos[c] && 'ゃゅょ'.includes(next||'\0')){out+=combos[c]+({'ゃ':'a','ゅ':'u','ょ':'o'}[next]);i++;continue;}
    if(c==='ー'){out+=(out.match(/[aeiou](?=[^aeiou]*$)/)||['-'])[0];continue;}
    if(c==='ん' && /[あいうえおやゆよ]/.test(next||'')){out+="n'";continue;}
    out+=map[c]||({'。':'.','、':', ','？':'?','！':'!','　':' '}[c]||c);
  }
  return out;
}
const words={今日:'오늘',明日:'내일',昨日:'어제',会社:'회사',仕事:'일',働く:'일하다',行く:'가다',来る:'오다',帰る:'돌아가다',食べる:'먹다',飲む:'마시다',見る:'보다',買う:'사다',話す:'말하다',勉強:'공부',日本語:'일본어',韓国:'한국',日本:'일본',私:'저',名前:'이름',友達:'친구',家:'집',旅行:'여행',趣味:'취미',好き:'좋아함',コーヒー:'커피',水:'물',お茶:'차',パン:'빵',寿司:'초밥',朝:'아침',昼:'낮',夜:'밤',朝ごはん:'아침밥',週末:'주말',休む:'쉬다',楽しい:'즐겁다',おいしい:'맛있다',美味しい:'맛있다',大丈夫:'괜찮다',元気:'잘 지냄',天気:'날씨',店:'가게',駅:'역',電車:'전철',空港:'공항',ホテル:'호텔',一人:'한 명',二人:'두 명',時間:'시간',今:'지금',毎日:'매일',何:'무엇',どこ:'어디',いつ:'언제',食べ物:'음식',飲み物:'음료',一杯:'한 잔',温かい:'따뜻하다',冷たい:'차갑다'};
export function vocabulary(nodes){const seen=new Set();return nodes.flatMap(node=>{const key=words[node.orig]?node.orig:node.string;if(!words[key]||seen.has(key)||seen.size>=3)return [];seen.add(key);return [`${node.string}(${hiragana(node.read||'')}): ${words[key]}`];}).join(' / ');}
export function koreanTranslationInput(history){
  const input=history.at(-1)?.content?.trim()||'';
  if(input.startsWith('/번역 '))return input.slice(4).trim();
  if(!input.startsWith('/') && /[가-힣]/.test(input))return input;
  return null;
}
export function beginnerCorrection(text){
  if(/[?？「」『』]/.test(text))return null;
  const rules=[[/ますた/g,'ました','과거의 일을 말할 때는 「ますた」가 아니라 「ました」라고 해요.'],[/ですた/g,'でした','「です」의 과거형은 「でした」예요.'],[/食べるました/g,'食べました','「食べる」를 정중한 과거형으로 말하면 「食べました」예요.'],[/飲むました/g,'飲みました','「飲む」를 정중한 과거형으로 말하면 「飲みました」예요.'],[/好きます/g,'好きです','좋아한다고 말할 때는 「好きです」라고 해요.']];
  for(const [pattern,replacement,explanation]of rules)if(pattern.test(text))return {japanese:text.replace(pattern,replacement),explanation};
  return null;
}
export function introductionReply(text){
  const match=/^(?:こんにちは[。、\s]*)?(?:私は|わたしは)([ァ-ヶー]{1,16})です[。.!！]?$/.exec(text.trim());
  if(!match || /プログラマー|エンジニア/.test(match[1]))return null;
  return {japanese:`${match[1]}さん、こんにちは。今日は何をしましたか？`,korean:`${match[1]} 씨, 안녕하세요. 오늘 무엇을 했나요?`};
}
export function similarCorrection(original,candidate){
  const clean=s=>s.replace(/[\s。、！？!?]/g,'');const a=clean(original),b=clean(candidate||'');
  if(!a||!b||a===b||/[가-힣]/.test(b))return '';
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return row[b.length]/Math.max(a.length,b.length)<=0.3?candidate:'';
}
