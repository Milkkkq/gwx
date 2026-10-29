const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const crypto=require('crypto');
const app=express(),server=http.createServer(app),io=new Server(server,{cors:{origin:'*'}});
app.use(express.static('public'));
app.get('/health',(_,res)=>res.json({ok:true,game:'brainwave-online'}));
const PORT=process.env.PORT||3000,rooms=new Map();
const praise=['你们的脑电波已经偷偷连上线了！','这不是巧合，这是默契在发光。','你们仨的想象力像是共用了一颗超灵大脑。','恭喜解锁隐藏成就：心有灵犀一点通！','你们把随机联想玩成了艺术。','这份默契，建议申请专利。','语言有边界，你们的脑洞没有。','今日最佳队友：你们三位，毫无悬念。','你们之间一定有一条看不见的灵感 Wi-Fi。'];
const norm=s=>String(s||'').trim().toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
const groups=[['猫','cat','kitty','小猫'],['狗','dog','puppy','小狗'],['开心','快乐','高兴','happy','joyful','glad'],['悲伤','难过','伤心','sad','unhappy'],['汽车','轿车','car','auto'],['手机','电话','mobilephone','cellphone'],['海','大海','海洋','ocean','sea'],['树','tree'],['花','flower','blossom'],['火','fire'],['水','water'],['太阳','sun'],['月亮','moon'],['朋友','friend'],['爱','love'],['家','home','house'],['快速','快','迅速','fast','quick','rapid'],['漂亮','美丽','好看','beautiful','pretty'],['聪明','机灵','smart','clever'],['食物','食品','food'],['音乐','music'],['书','书籍','book'],['冷','寒冷','cold'],['热','炎热','hot'],['小','微小','small','little'],['大','巨大','big','large']];
function sameMeaning(words){const a=words.map(norm);return a.every(Boolean)&&(new Set(a).size===1||groups.some(g=>{const s=new Set(g.map(norm));return a.every(w=>s.has(w))}));}
function view(r){return {code:r.code,phase:r.phase,round:r.round,seedWord:r.seedWord,players:[...r.players.values()].map(p=>({...p,host:p.id===r.hostId,ready:!!r.ready[p.id]})),words:['vote','between','result'].includes(r.phase)?r.order.map(id=>({playerId:id,name:r.players.get(id)?.name||'玩家',word:r.words[id]||''})):[],submittedBy:r.order.filter(id=>r.words[id]),votes:Object.entries(r.votes).map(([playerId,agree])=>({playerId,name:r.players.get(playerId)?.name||'玩家',agree})),voted:Object.keys(r.votes).length,result:r.result,compliment:r.compliment,message:r.message};}
function emit(r){io.to(r.code).emit('state',view(r))}
function reset(r,seed){r.round++;r.seedWord=seed;r.phase='write';r.words={};r.votes={};r.ready={};r.result=null;r.compliment=null;r.message=''}
function err(s,m){s.emit('errorMessage',m)}
function get(s){return rooms.get(s.data.code)}
io.on('connection',s=>{
 s.on('createRoom',({name})=>{let code;do{code=crypto.randomBytes(3).toString('hex').slice(0,4).toUpperCase()}while(rooms.has(code));const r={code,hostId:s.id,players:new Map(),order:[],phase:'lobby',round:0,seedWord:'星星',words:{},votes:{},ready:{}};rooms.set(code,r);add(r,s,name);s.data.code=code;emit(r)});
 s.on('joinRoom',({code,name})=>{const r=rooms.get(String(code||'').trim().toUpperCase());if(!r)return err(s,'找不到房间号，请检查后再试。');if(r.phase!=='lobby'||r.players.size>=3)return err(s,'房间已满或游戏已经开始。');add(r,s,name);s.data.code=r.code;emit(r)});
 function add(r,s,name){r.players.set(s.id,{id:s.id,name:String(name||'玩家').trim().slice(0,14)||'玩家',connected:true});r.order.push(s.id);s.join(r.code)}
 s.on('startGame',()=>{const r=get(s);if(!r)return;if(s.id!==r.hostId)return err(s,'只有房主可以开始。');if(r.players.size!==3)return err(s,'需要三位玩家都加入后才能开始。');reset(r,'星星');emit(r)});
 s.on('submitWord',({word})=>{const r=get(s);if(!r||r.phase!=='write')return;word=String(word||'').trim().slice(0,40);if(!word)return err(s,'先输入一个联想词吧。');r.words[s.id]=word;if(r.order.every(id=>r.words[id])){r.phase='vote';r.result={semanticMatch:sameMeaning(r.order.map(id=>r.words[id]))}}emit(r)});
 s.on('vote',({agree})=>{const r=get(s);if(!r||r.phase!=='vote'||typeof agree!=='boolean'||!r.order.includes(s.id))return;r.votes[s.id]=agree;if(r.order.every(id=>typeof r.votes[id]==='boolean')){if(r.result.semanticMatch||r.order.every(id=>r.votes[id])){r.phase='result';r.compliment=praise[crypto.randomInt(praise.length)];r.message=r.result.semanticMatch?'系统识别到三个词在内置词表中相近！':'三位玩家全部投下同意票！'}else{r.phase='between';r.message='这轮还没达成一致，准备好后继续下一轮。'}}emit(r)});
 s.on('readyNext',()=>{const r=get(s);if(!r||r.phase!=='between')return;r.ready[s.id]=true;if(r.order.every(id=>r.ready[id]))reset(r,r.words[r.order[crypto.randomInt(r.order.length)]]);emit(r)});
 s.on('playAgain',()=>{const r=get(s);if(!r||r.phase!=='result')return;reset(r,r.words[r.order[crypto.randomInt(r.order.length)]]);emit(r)});
 s.on('disconnect',()=>{const r=get(s);if(!r)return;const p=r.players.get(s.id);if(p)p.connected=false;emit(r);setTimeout(()=>{const q=rooms.get(r.code);if(q&&q.players.has(s.id)&&!q.players.get(s.id).connected){q.players.delete(s.id);q.order=q.order.filter(id=>id!==s.id);delete q.words[s.id];delete q.votes[s.id];delete q.ready[s.id];if(q.hostId===s.id)q.hostId=q.order[0]||null;if(!q.players.size)rooms.delete(q.code);else emit(q)}},30000)});
});
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log('Brainwave game listening on '+PORT));
