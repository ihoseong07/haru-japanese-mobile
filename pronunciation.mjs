import {hiragana,romanize} from './japanese.mjs';

// Learner-friendly approximations, not IPA or an assessment of pronunciation.
const rows=[['あいうえお','아 이 우 에 오'],['かきくけこ','카 키 쿠 케 코'],['がぎぐげご','가 기 구 게 고'],['さしすせそ','사 시 스 세 소'],['ざじずぜぞ','자 지 즈 제 조'],['たちつてと','타 치 츠 테 토'],['だぢづでど','다 지 즈 데 도'],['なにぬねの','나 니 누 네 노'],['はひふへほ','하 히 후 헤 호'],['ばびぶべぼ','바 비 부 베 보'],['ぱぴぷぺぽ','파 피 푸 페 포'],['まみむめも','마 미 무 메 모'],['やゆよ','야 유 요'],['らりるれろ','라 리 루 레 로'],['わゐゑを','와 위 웨 오'],['ぁぃぅぇぉ','아 이 우 에 오'],['ゔ','부']];
const kanaMap=Object.fromEntries(rows.flatMap(([kana,hangul])=>[...kana].map((key,i)=>[key,hangul.split(' ')[i]])));
Object.assign(kanaMap,{'きゃ':'캬','きゅ':'큐','きょ':'쿄','ぎゃ':'갸','ぎゅ':'규','ぎょ':'교','しゃ':'샤','しゅ':'슈','しょ':'쇼','じゃ':'자','じゅ':'주','じょ':'조','ちゃ':'차','ちゅ':'추','ちょ':'초','にゃ':'냐','にゅ':'뉴','にょ':'뇨','ひゃ':'햐','ひゅ':'휴','ひょ':'효','びゃ':'뱌','びゅ':'뷰','びょ':'뵤','ぴゃ':'퍄','ぴゅ':'퓨','ぴょ':'표','みゃ':'먀','みゅ':'뮤','みょ':'묘','りゃ':'랴','りゅ':'류','りょ':'료','ふぁ':'파','ふぃ':'피','ふぇ':'페','ふぉ':'포','てぃ':'티','でぃ':'디','とぅ':'투','どぅ':'두','しぇ':'셰','じぇ':'제','ちぇ':'체','うぃ':'위','うぇ':'웨','うぉ':'워','ゔぁ':'바','ゔぃ':'비','ゔぇ':'베','ゔぉ':'보'});
const normalized=text=>text.replace(/[\s。？！!?.,、]/g,'');
const known=new Map([
 ['お名前は何ですか','おなまえわ なんですか'],['どこから来ましたか','どこから きましたか'],['趣味は何ですか','しゅみわ なんですか'],['日本のどこに行きましたか','にほんの どこに いきましたか'],
 ['いらっしゃいませ','いらっしゃいませ'],['何にしますか','なにに しますか'],['ホットですか、アイスですか','ほっとですか、あいすですか'],['サイズはどうしますか','さいずわ どーしますか'],['店内ですか、お持ち帰りですか','てんないですか、おもちかえりですか'],
 ['何名様ですか','なんめいさまですか'],['ご注文はお決まりですか','ごちゅーもんわ おきまりですか'],['お飲み物は何にしますか','おのみものわ なににしますか'],['お味はいかがですか','おあじわ いかがですか'],
 ['今日は何をしましたか','きょーわ なにを しましたか'],['朝ごはんは何を食べましたか','あさごはんわ なにを たべましたか'],['週末は何をしたいですか','しゅーまつわ なにを したいですか'],['どんな食べ物が好きですか','どんな たべものが すきですか'],
 ['ミナです','みなです'],['韓国から来ました','かんこくから きました'],['趣味は旅行です','しゅみわ りょこーです'],['大阪に行きました','おーさかに いきました'],['コーヒーをください','こーひーを ください'],['アイスでお願いします','あいすで おねがいします'],['小さいサイズでお願いします','ちいさいさいずで おねがいします'],['持ち帰りでお願いします','もちかえりで おねがいします'],
 ['二人です','ふたりです'],['これをお願いします','これを おねがいします'],['お水をください','おみずを ください'],['とてもおいしいです','とても おいしいです'],['今日は仕事をしました','きょーわ しごとを しました'],['パンを食べました','ぱんを たべました'],['家で休みたいです','いえで やすみたいです'],['寿司が好きです','すしが すきです'],
 ['こんにちは','こんにちわ'],['こんばんは','こんばんわ'],['日本語で言ってみましょう','にほんごで いってみましょー'],['もう一度言ってみましょう','もーいちど いってみましょー']
].map(([jp,kana])=>[normalized(jp),kana]));
function attach(text,jong){const match=/([가-힣])([^가-힣]*)$/.exec(text);if(!match)return text;const code=match[1].charCodeAt(0)-0xac00;if(code%28)return text;return text.slice(0,match.index)+String.fromCharCode(0xac00+code+jong)+match[2];}
function vowel(kana){const sound=romanize(kana);return ({a:'아',i:'이',u:'우',e:'에',o:'오'})[sound.match(/[aeiou](?!.*[aeiou])/)?.[0]]||'';}
function kanaToHangul(input){
 const text=hiragana(input.normalize('NFKC')).replace(/[’‘'ˈ]/g,'');let out='',previous='';
 for(let i=0;i<text.length;i++){
  const c=text[i],next=text[i+1]||'';
  if(c==='ん'){out=attach(out,/[ばびぶべぼぱぴぷぺぽまみむめも]/.test(next)?16:4);previous='';continue;}
  if(c==='っ'){out=attach(out,/[かきくけこがぎぐげご]/.test(next)?1:/[ぱぴぷぺぽばびぶべぼ]/.test(next)?17:19);continue;}
  if(c==='ー'){out+=vowel(previous);continue;}
  const pair=c+next,key=kanaMap[pair]?pair:c;
  if(kanaMap[key]){out+=kanaMap[key];previous=key;i+=key.length-1;}
  else{out+=({'。':'.','、':', ','？':'?','！':'!','　':' '}[c]??c);if(!/\s/.test(c))previous='';}
 }
 return out.replace(/\s+/g,' ').trim();
}
function japaneseReading(japanese){
 const sentences=japanese.trim().match(/[^。？！!?]+[。？！!?]?/g)||[];if(!sentences.length)return '';
 const out=[];for(const sentence of sentences){const key=normalized(sentence);let kana=known.get(key);if(!kana&&/^[ぁ-ゖァ-ヶー\s、,]+$/.test(key))kana=hiragana(key).replace(/こんにちは/g,'こんにちわ').replace(/こんばんは/g,'こんばんわ');if(!kana)return '';out.push(kana+(/[?？]$/.test(sentence)?'？':/[!！]$/.test(sentence)?'！':'。'));}return out.join(' ');
}
const romanKeys=Object.keys(kanaMap).map(kana=>[romanize(kana),kana]).sort((a,b)=>b[0].length-a[0].length);
function romanToKana(text){let out='';text=text.toLowerCase();for(let i=0;i<text.length;){if(text[i]==='n'&&!/[aeiouy]/.test(text[i+1]||'')&&(text[i+1]!=='n'||/^[aeiouy]/.test(text.slice(i+2)))){out+='ん';i++;continue;}if(text[i]===text[i+1]&&/[kstp]/.test(text[i])){out+='っ';i++;continue;}const pair=romanKeys.find(([key])=>text.startsWith(key,i));if(pair){out+=pair[1];i+=pair[0].length;}else{out+=text[i++];}}return out;}
export function koreanPronunciation(reading='',japanese=''){
 let kana=japaneseReading(japanese)||reading;
 if(!/[ぁ-ゖァ-ヶ]/.test(kana)&&/[a-z]/i.test(kana))kana=romanToKana(kana);
 if(!/[ぁ-ゖァ-ヶ]/.test(kana))return '';
 // Free-conversation readings already contain phonetic particles. Include the
 // fixed invitation if the model's reading covers just the translated sentence.
 if(japanese.endsWith(' 日本語で言ってみましょう。')&&!/にほんご/.test(hiragana(kana)))kana+=' にほんごで いってみましょー。';
 if(japanese.endsWith(' もう一度言ってみましょう。')&&!/もーいちど|もういちど/.test(hiragana(kana)))kana+=' もーいちど いってみましょー。';
 return kanaToHangul(kana);
}
export function vocabularyPronunciation(text=''){return text.replace(/([（(])([ぁ-ゖァ-ヶー\s]+)([）)])/g,(_,open,kana,close)=>`${open}${kana} · ${kanaToHangul(kana)}${close}`);}
