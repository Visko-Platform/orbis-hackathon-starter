import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const slots = [], effects = [], pending = [], timers = new Map(), instances = [], sent = [];
let cursor = 0, timerId = 0;
const hooks = {
  useRef(value) { const i = cursor++; return slots[i] ??= {current:value}; },
  useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], v => { slots[i] = v; }]; },
  useEffect(fn, deps) { const i = cursor++; const prev = effects[i]; if (!prev || deps.some((d,j) => d !== prev.deps[j])) pending.push(() => { prev?.cleanup?.(); effects[i] = {deps, cleanup:fn()}; }); },
};
class Recognizer {
  constructor() { instances.push(this); }
  start() { this.started = true; }
  abort() { this.aborted = true; this.onend?.(); }
  stop() { this.onend?.(); }
  speak(text) { this.onresult?.({resultIndex:0, results:[Object.assign([{transcript:text}], {isFinal:true})]}); }
}
const mod = {exports:{}};
const code = ts.transpileModule(fs.readFileSync('components/cutline/use-voice-director.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const imports = {react:hooks,sonner:{toast:{error(){},info(){}}},'./speech':{speechRecognizer:()=>Recognizer}};
new Function('require','module','exports','navigator','setTimeout','clearTimeout',code)(n=>imports[n],mod,mod.exports,{language:'en-US'},fn=>{timers.set(++timerId,fn);return timerId;},id=>timers.delete(id));
let options = {roomId:'ONE',enabled:true,busy:false,onDirection:async text=>{sent.push(text);}};
async function render() { cursor=0; const result=mod.exports.useVoiceDirector(options); while(pending.length) pending.shift()(); await Promise.resolve(); return result; }
let view=await render(); view.toggle(); view=await render();
assert.equal(view.active,true);
let first=instances.at(-1); first.speak('Open the door'); first.onend();
await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
assert.deepEqual(sent,['Open the door']);
for (const [id,fn] of [...timers]) {timers.delete(id);fn();}
assert.equal(instances.length,2, 'automatically listens after delivery');
view=await render(); const second=instances.at(-1); second.speak('Must not send'); view.toggle(); second.onend();
assert.deepEqual(sent,['Open the door'], 'stop discards unfinished command');
view=await render(); view.toggle(); view=await render(); const third=instances.at(-1); third.speak('Wrong room');
options={...options,roomId:'TWO'}; view=await render(); third.onend();
assert.deepEqual(sent,['Open the door'], 'room switch invalidates late callback');
assert.equal(third.aborted,true);
view=await render(); view.toggle(); view=await render(); const fourth=instances.at(-1); fourth.speak('Paused scene');
options={...options,enabled:false}; await render(); fourth.onend();
assert.deepEqual(sent,['Open the door'], 'pause cancels microphone');
console.log('PASS voice: one delivery, automatic listening, stop cancellation, room isolation, pause cancellation; zero provider calls');
