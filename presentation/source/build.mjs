/** CUTLINE portable presentation authoring and rendering source.
 * Required runtime configuration is documented in README.md.
 * Original PPTX/PDF deliverables are never overwritten.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const SOURCE_DIR=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const mode=args[0]||'build';
if(!['build','render','help','--help'].includes(mode))throw Error('Use build, render, or help.');
if(mode==='help'||mode==='--help'){
 console.log('build.mjs build [--out DIR] [--pdf]\nbuild.mjs render INPUT.pptx [--out DIR] [--pdf]');
 process.exit(0);
}
function option(name,fallback){const i=args.indexOf(name);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`Missing value for ${name}`);return args[i+1];}
function requiredEnv(name){const value=process.env[name];if(!value)throw Error(`Set ${name} from the bundled workspace runtime. See README.md.`);return path.resolve(value);}
const ROOT=path.resolve(option('--out',path.join(SOURCE_DIR,'generated')));
const OUTPUT=path.join(ROOT,'output');
const MODULES=requiredEnv('RUNTIME_NODE_MODULES');
const runtimeRequire=createRequire(path.join(MODULES,'package.json'));
const {Presentation,PresentationFile,FileBlob}=await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
const sharp=runtimeRequire('sharp');
await fs.mkdir(ROOT,{recursive:true});
await fs.mkdir(OUTPUT,{recursive:true});
await fs.mkdir(path.join(ROOT,'.build'),{recursive:true});
await fs.mkdir(path.join(ROOT,'renders'),{recursive:true});
if(mode==='render'){
 const input=args[1];if(!input||input.startsWith('--'))throw Error('render requires an existing PPTX path.');
 await renderDeck(path.resolve(input));
 if(args.includes('--pdf'))await exportPdf(path.resolve(input));
 console.log(`Rendered existing deck to ${ROOT}`);
 process.exit(0);
}
const SKILL=requiredEnv('PRESENTATIONS_SKILL_DIR');
const PY=requiredEnv('RUNTIME_PYTHON');
const {finalizePresentation,resolvePresentationFont}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const FONT=resolvePresentationFont({fontFamily:'Helvetica Neue'});
const C={ink:'#080b12',navy:'#182538',white:'#f4f3ee',amber:'#eac18c',muted:'#afbac8',rule:'#415064'};
const P=Presentation.create({slideSize:{width:1280,height:720}});
const assetFiles={multiverse:'multiverse.png',train:'train.png',deep:'deep.png',web:'web.jpg',galaxy:'galaxy.jpg',sun:'sun.jpg',earth:'earth.jpg',sf:'sf.jpg'};
const assets=Object.fromEntries(Object.entries(assetFiles).map(([k,v])=>[k,path.join(SOURCE_DIR,'assets',v)]));
const provenance=JSON.parse(await fs.readFile(path.join(SOURCE_DIR,'assets','provenance.json'),'utf8'));
// Full agency provenance is bundled in assets/provenance.json and slide notes.
const SOURCE='https://github.com/Visko-Platform/orbis-hackathon-starter/tree/6de7ad733e90967f25979afcfca55b73a71f064a';
const API='https://www.reactor.inc/models/visko-orbis-stable/api';
const REPO='repository';
const talk=[
{duration:12,title:'CUTLINE',words:'CUTLINE turns a theater audience into the director. We begin in imagined deep space, arrive in one shared room, and let that room change the film.',visual:'Hold the multiverse cover. Begin a slow push toward the central sphere. Keep the title editable and fixed.',action:'Presenter begins. No provider request on stage yet.',sources:['Original speculative AI artwork, assets/multiverse.png. Not a factual visualization.']},
{duration:18,title:'A theater becomes the director',words:'A woman reaches the last door of a midnight train. Everyone here sees the same uncertainty. On their phones, they choose to open the door, follow a light, or stop the train. The winning choice becomes the next direction.',visual:'The last train fills the right side. Three exact choices appear as readable text on the left.',action:'Show the decision moment. Do not imply a prerecorded branch is live generated.',sources:[REPO+'/lib/cutline/content.ts',REPO+'/components/cutline/audience.tsx','Original AI story still, assets/train.png.']},
{duration:24,title:'One canvas, from cosmos to cinema',words:'The opening is one continuous three-dimensional canvas. Click a destination and the camera travels toward it. NASA imagery textures the Earth sphere, and an original orbital photograph anchors San Francisco. These are cinematic, compressed scales. The source references shown here are not app screenshots. Orbis takes over inside the fictional film.',visual:'The gallery shows credited source references, not a screenshot of the application. In the app, one Three.js canvas moves continuously among clickable projected destinations, through a textured Earth sphere and a San Francisco aerial plane, into the theater and fictional film.',action:'Rehearse the continuous flight and destination selection before presenting. Keep astronomy labeled as cinematic compressed scales, not physically exact distances. The Earth sphere uses a NASA texture; the San Francisco plane uses an original orbital photograph. The Orbis model handles the fictional film. Do not claim these source thumbnails depict the rendered app.',sources:[REPO+'/components/cutline',REPO+'/lib/cutline/content.ts',...provenance.assets.map(a=>a.title+' — '+a.credit+' — '+a.source_page_url),'Source references shown on this slide are not app screenshots. Multiverse: speculative AI artwork. The Three.js camera journey uses cinematic compressed scales. Six thumbnails retain their exact agency image classifications.']},
{duration:20,title:'One decision, one shared result',words:'The host opens a poll. Audience members can change their vote while it stays open. Closing the poll freezes the tally atomically, resolves a tie using the visible choice order, and allows the winner to apply once. Everyone receives the saved story state.',visual:'Readable four-step interaction sequence. A live app demonstration can replace the slide while narration continues.',action:'If the session is ready, open the phone poll, cast a vote, close it, and apply the winner. If it is not ready, remain on the honest process slide.',sources:[REPO+'/db/schema.ts',REPO+'/app/api/stories/[id]/vote/route.ts',REPO+'/app/api/stories/[id]/action/route.ts',REPO+'/app/api/stories/[id]/events/route.ts']},
{duration:24,title:'The audience-to-canvas architecture',words:'Phones send votes to the application. D one stores ballots and freezes the result. The optional Nebius director turns that result and story memory into a visual instruction. Reactor carries the host’s prompt to Visko Orbis, which streams the shared canvas. Server sent events synchronize the audience. The official starter informs video integration.',visual:'Native editable architecture diagram. Trace the main row left to right, then the persistence and state synchronization return path.',action:'Explain the actual boundary: a vote alone does not mint a video token or direct the model. Host applies the closed winner.',sources:[REPO+'/db/schema.ts',REPO+'/lib/cutline/director.ts',REPO+'/components/cutline/use-live-video.ts',REPO+'/app/api/stories/[id]/token/route.ts',SOURCE,API,'Official starter audited at commit 6de7ad733e90967f25979afcfca55b73a71f064a on 2026-09-12. CUTLINE is a separate application, not the unmodified starter.']},
{duration:20,title:'The live session exposes its progress',words:'One observed Stable session delivered twenty-five-sixty by fourteen-forty video at eighteen frames per second. That describes one observed session. The interface separately tracks a sent cue, command acceptance, and the next chunk. Acceptance alone does not prove the requested change appeared. We inspect the picture live.',visual:'Large session dimensions and frame-rate typography. Beneath, an editable cue-state chain ending in visual inspection.',action:'Point at the live video and trace in the app if available. Do not quote one latency observation as a benchmark.',sources:['Browser observations supplied by project lead. Latest Orbis Stable session showed 2560×1440 delivery, 18 fps, and image_confirmed. Earlier Orbis Dynamic session also delivered live video. No standalone trace log was captured for the earlier timing observation. Earth imagery visibly distorted after 40 seconds in a Stable test, motivating use of original NASA source imagery in the cinematic 3D opening, with generated video reserved for fiction. This is not a measured quality benchmark.',REPO+'/components/cutline/use-live-video.ts',API,'Reactor documentation describes 832×480 generation at 18 fps with upscaled delivery. 2560×1440 is a delivery resolution, not native model generation resolution.']},
{duration:18,title:'Creative control preserves the scene',words:'Creativity stays visible. Story memory anchors the character and setting. The director requests one visible change. Camera and lighting cues reshape the shot. Branch history preserves decisions, and returning to an earlier scene excludes the abandoned future from director context.',visual:'Two large text columns, continuity on the left and live direction on the right. Use the cosmic-web simulation as a restrained background texture.',action:'Mention that model continuity is a prompt constraint rather than a guarantee. The saved branch context is deterministic application behavior.',sources:[REPO+'/lib/cutline/director.ts',REPO+'/lib/cutline/story.ts',REPO+'/tests/story.test.ts',REPO+'/lib/cutline/content.ts',provenance.assets.find(a=>a.id==='cosmic-web').source_page_url,'Cosmic-web background credit: '+provenance.assets.find(a=>a.id==='cosmic-web').credit+'; scientific simulation.']},
{duration:18,title:'The application behavior has test evidence',words:'Local integration passed twelve groups covering two hundred ten assertions. Tests cover owner isolation, vote replacement, frozen results, races, branching, exports, and event reconnection. Provider availability and picture quality still need observation in each live rehearsal.',visual:'Native evidence table and two large test totals. Source run date is visible. Avoid checkmark decoration or false provider-test claims.',action:'Refer to retained local test report. Do not reframe these application checks as load testing or an end-to-end provider benchmark.',sources:[REPO+'/docs/testing/api-results.json',REPO+'/docs/testing/sse-evidence.json',REPO+'/tests/integration.mjs',REPO+'/tests/story.test.ts','Recorded integration run completed 2026-09-12T22:23:48.873Z. 12 passed groups, 0 failed, 210 assertions.']},
{duration:14,title:'The complete live loop was verified',words:'One combined local run carried a real vote through Nebius into Orbis. The movie continued at eighteen frames per second. We inspected the doorway scene. These timings describe one sample.',visual:'An editable evidence table traces the combined local run: saved audience winner, Nebius scene and three choices, Orbis acceptance, subsequent chunk, and picture inspection. The 93 ms acknowledgment and 1,927 ms next chunk are separate observed timings.',action:'Explain the single combined observation, not a performance benchmark. The audience page used a separate tab; independent identities were verified by the API suite. Check provider readiness for the current demonstration. Deployment and GitHub publication are separate release tasks.',sources:[REPO+'/docs/testing/combined-live.json',REPO+'/docs/testing/api-results.json',REPO+'/lib/cutline/director.ts','2026-09-12T23:30:48.972571+00:00: local production build, reactor/visko-orbis-stable, Nebius openai/gpt-oss-120b. Open the last door won; Nebius produced Mara Opens the Amber Door with three choices; source nebius; image conditioning confirmed; 18 fps; prompt acknowledgment 93 ms; next chunk after cue 1927 ms. Visual inspection showed Mara near an amber train doorway. These are one-run observations, not a benchmark or proof of every requested semantic detail.']},
{duration:12,title:'The audience changes everything',words:'The demonstration ends with a real choice in this room. Join the audience, choose the next direction, and watch the shared film respond. This is CUTLINE.',visual:'Return to a clean cinematic closing frame. Presenter ends exactly at 03:00. A separate live demonstration may continue after the timed pitch.',action:'At 03:00 stop narration. Leave the room ready for a vote. Do not invent a working public URL or a QR code in the deck.',sources:[REPO+'/components/cutline/studio.tsx',REPO+'/components/cutline/audience.tsx','Original speculative AI background, assets/multiverse.png.']}
];
let elapsed=0;for(const t of talk){t.start=elapsed;t.end=elapsed+t.duration;elapsed=t.end;}if(elapsed!==180)throw Error('Timing must total exactly 180 seconds');
function rect(s,x,y,w,h,fill=C.navy){return s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});}
function text(s,txt,x,y,w,h,size=30,color=C.white,bold=false,align='left') {const a=s.shapes.add({geometry:'textbox',name:txt.slice(0,45),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});a.text=txt;a.text.style={typeface:FONT,fontSize:size,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:{left:0,right:0,top:0,bottom:0}};return a;}
async function img(s,k,x,y,w,h,fit='cover'){return s.images.add({blob:new Uint8Array(await fs.readFile(assets[k])),contentType:assets[k].endsWith('.png')?'image/png':'image/jpeg',alt:k==='multiverse'?'Speculative AI multiverse art':k==='train'?'AI concept still for The last train':provenance.assets.find(a=>({deep:'deep-field',web:'cosmic-web',galaxy:'milky-way',sun:'sun',earth:'earth',sf:'san-francisco'})[k]===a.id)?.display_label||k,position:{left:x,top:y,width:w,height:h},fit});}
function base(i,title){const s=P.slides.add();s.background.fill=C.ink;if(title)text(s,title,66,51,1148,92,46,C.white,true);text(s,String(i).padStart(2,'0'),1170,664,44,25,17,C.muted,false,'right');const t=talk[i-1];s.speakerNotes.textFrame.setText(`[${clock(t.start)}–${clock(t.end)} | ${t.duration} seconds]\n\nSPEAKER SCRIPT\n${t.words}\n\nVISUAL / STORYBOARD\n${t.visual}\n\nDEMO CUE\n${t.action}\n\nTIMING\nUse the hard time boundary above. Finish narration, then hold until the next cue. All ten slots sum to exactly 180 seconds. Natural speaking rate varies.\n\nSOURCES\n${t.sources.join('\n')}`);return s;}
function clock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function line(s,x1,y1,x2,y2,color=C.rule,width=1){return s.shapes.add({geometry:'line',position:{left:x1,top:y1,width:x2-x1,height:y2-y1},fill:'none',line:{fill:color,width,style:'solid'}});}
function block(s,title,body,x,y,w){text(s,title,x,y,w,45,29,C.amber,true);text(s,body,x,y+57,w,140,26,C.white);}
function node(s,label,detail,x,y,w,h=128,optional=false){const b=s.shapes.add({geometry:'rect',name:label,position:{left:x,top:y,width:w,height:h},fill:C.navy,line:{fill:optional?C.amber:C.rule,width:1,style:optional?'dashed':'solid'}});text(s,label,x+16,y+18,w-32,47,24,optional?C.amber:C.white,true);text(s,detail,x+16,y+70,w-32,h-78,19,C.muted);return b;}
function connect(s,a,b,from='right',to='left',dashed=false){return s.shapes.connect(a,b,{kind:from==='right'?'straight':'elbow',fromSide:from,toSide:to,line:{fill:C.amber,width:2,style:dashed?'dashed':'solid'},tail:{type:'triangle',width:'sm',length:'sm'}});}
function table(s,values,position,widths,size=23){const t=s.tables.add({rows:values.length,columns:values[0].length,left:position[0],top:position[1],width:position[2],height:position[3],columnWidths:widths,values});t.borders.assign({fill:C.rule,width:.7,style:'solid'});t.cells.block({row:0,column:0,rowCount:values.length,columnCount:values[0].length}).assign({fill:C.ink,textStyle:{typeface:FONT,fontSize:size,color:C.white},margins:{left:14,right:14,top:12,bottom:12},anchor:'center'});for(let c=0;c<values[0].length;c++){const q=t.getCell(0,c);q.fill=C.navy;q.text.style={typeface:FONT,fontSize:size,color:C.amber,bold:true};}return t;}
// 1: minimal cinematic cover with native editable type.
{const s=base(1);await img(s,'multiverse',385,0,895,720);rect(s,0,0,1280,720,'linear(0deg, #080b12 0%, #080b12/96 32%, #080b12/22 69%, #080b12/0 100%)');text(s,'CUTLINE',66,239,700,126,110,C.white,true);text(s,'The audience changes everything.',72,389,800,58,33,C.amber);text(s,'Audience-directed live cinema',72,518,680,45,26,C.muted);text(s,'Speculative multiverse artwork',72,659,550,25,16,C.muted);}
// 2: one story decision as the product premise.
{const s=base(2);await img(s,'train',530,0,750,720);rect(s,0,0,1280,720,'linear(0deg, #080b12 0%, #080b12 36%, #080b12/5 82%)');text(s,'A theater becomes\nthe director',66,60,690,145,51,C.white,true);text(s,'One shared film.\nA choice on every phone.',68,235,495,90,30,C.muted);text(s,'Open the last door',68,385,520,46,32,C.amber,true);text(s,'Follow the flickering light',68,449,520,46,32,C.white);text(s,'Pull the emergency brake',68,513,520,46,32,C.white);text(s,'“The last train” concept still, AI-generated',68,659,610,25,16,C.muted);}
// 3: source references for the continuous 3D flight; not app screenshots.
{const s=base(3,'One canvas, from cosmos to cinema');
const frames=[['deep','Universe','Infrared observation'],['web','Cosmic web','Scientific simulation'],['galaxy','Milky Way','Artist concept'],['sun','Solar system','Sun, EUV observation'],['earth','Earth','Apollo 17 photograph'],['sf','San Francisco','ISS photograph']];
for(let i=0;i<6;i++){const x=66+i*194;await img(s,frames[i][0],x,220,176,154,'contain');text(s,frames[i][1],x,389,185,59,22,C.white,true);text(s,frames[i][2],x,448,183,45,16,C.muted);}
text(s,'Click a destination. The camera travels.',66,145,1148,44,29,C.amber,true);text(s,'NASA texture on the Earth sphere',66,546,570,76,29,C.amber,true);text(s,'Original San Francisco aerial plane',676,546,535,76,29,C.amber,true);text(s,'Source references shown here. The app uses one Three.js canvas with cinematic, compressed scales. Orbis begins in the fictional film.',66,656,1125,39,15,C.muted);}
// 4: interaction states, not a decorative dashboard.
{const s=base(4,'One decision, one shared result');const xs=[66,371,676,981],titles=['Open','Vote','Close','Apply'],body=['Host opens the\nscene’s poll.','Each viewer can\nreplace their ballot.','The database freezes\nthe final tally.','Host applies the\nwinner once.'];for(let i=0;i<4;i++){text(s,'0'+(i+1),xs[i],195,210,83,60,C.amber);text(s,titles[i],xs[i],297,228,62,40,C.white,true);text(s,body[i],xs[i],390,240,120,27,C.muted);}text(s,'Ties follow the visible choice order. A poll with no votes has no winner.',66,594,1148,63,29,C.white);}
// 5: explicitly requested editable architecture.
{const s=base(5,'The audience-to-canvas architecture');
const n1=node(s,'Audience','Phone vote',66,184,204);
const n2=node(s,'Atomic tally','D1 closes poll',310,184,204);
const n3=node(s,'Nebius','Optional director',554,184,222,128,true);
const n4=node(s,'Reactor','Visko Orbis',816,184,200);
const n5=node(s,'Canvas','Shared film',1056,184,158);
connect(s,n1,n2);connect(s,n2,n3);connect(s,n3,n4);connect(s,n4,n5);
const audience=node(s,'SSE updates','Saved story and tally',66,407,204);
const saved=node(s,'Story storage','D1 state + version',310,407,204);
const context=node(s,'Story context','Memory and branch ancestry',554,407,222);
connect(s,n2,saved,'bottom','top');connect(s,saved,audience,'left','right');connect(s,context,n3,'top','bottom');
text(s,'Host applies the winner\nand sends the prompt',816,407,398,93,29,C.amber);
text(s,'Rehearsal can create a beat without Nebius.',66,584,1148,52,29,C.white);
text(s,'Video integration informed by Visko-Platform/orbis-hackathon-starter, commit 6de7ad7. Audience, Nebius and Orbis verified in one combined local run.',66,664,1100,36,15,C.muted);}
// 6: observations distinguish delivery and generator behavior.
{const s=base(6,'The live session exposes its progress');text(s,'2560 × 1440',66,176,785,135,94,C.white,true);text(s,'18 fps',907,188,309,105,78,C.amber,true);text(s,'Observed delivery resolution',70,309,720,42,28,C.muted);text(s,'Stable session observed',910,307,310,54,26,C.muted);const n1=node(s,'Cue sent','set_prompt',66,425,253,121);const n2=node(s,'Accepted','Command reply',368,425,253,121);const n3=node(s,'Next chunk','chunk_complete',670,425,253,121);const n4=node(s,'Picture checked','Human observation',972,425,242,121);connect(s,n1,n2);connect(s,n2,n3);connect(s,n3,n4);text(s,'Latency varies. Command acceptance does not establish visual compliance.',66,584,1150,65,29,C.white);text(s,'Stable session observed with reference image confirmed. Earlier Dynamic session also observed. Delivery is upscaled.',66,663,1110,35,15,C.muted);}
// 7: continuity and creative direction.
{const s=base(7);await img(s,'web',0,0,1280,720);rect(s,0,0,1280,720,'#080b12/84');text(s,'Creative control preserves the scene',66,51,1150,96,46,C.white,true);block(s,'Continuity','Story memory anchors the character,\nclothing, setting, and active branch.',66,203,550);block(s,'Visible change','A direction describes one action\nthat the picture can show.',693,203,521);block(s,'Branching','Earlier scenes remain available.\nAbandoned futures leave the context.',66,426,550);block(s,'Live cues','Camera and lighting controls\nreshape the ongoing shot.',693,426,521);text(s,'Continuity is a model instruction, not a guaranteed visual result. Background: NASA/NCSA cosmic-web simulation.',66,660,1120,34,16,C.muted);}
// 8: editable application test evidence.
{const s=base(8,'The application behavior has test evidence');text(s,'210',66,173,250,100,79,C.amber,true);text(s,'assertions',70,276,250,43,27,C.muted);text(s,'12 / 12',374,173,425,100,79,C.white,true);text(s,'integration groups passed',379,276,630,43,27,C.muted);table(s,[['Area','Verified behavior'],['Voting','Replacement, frozen tally, ties, apply once'],['Consistency','Concurrent mutations and branch ancestry'],['Access + recovery','Owner isolation, exports, SSE reconnect']], [66,367,1148,234],[280,868],24);text(s,'Local integration run: 12 September 2026. These checks do not establish provider availability, visual quality, or audience-scale load.',66,656,1120,44,16,C.muted);}
// 9: implementation and observed status kept separate.
{const s=base(9,'The complete live loop was verified');table(s,[['Stage','Combined local run','Evidence'],['Audience','Open the last door won','Winner saved and applied'],['Nebius','Scene + three new choices','Memory and source retained'],['Orbis Stable','Prompt accepted at 93 ms','Next chunk at 1,927 ms'],['Movie','18 fps; image confirmed','Doorway visually inspected']], [66,184,1148,358],[242,446,460],25);text(s,'One observed run. Timings vary with each session.',66,585,1148,54,29,C.amber);text(s,'Local production build, 12 September 2026. Cue acceptance does not prove every pictured detail.',66,660,1100,36,16,C.muted);}
// 10: simple closing visual.
{const s=base(10);await img(s,'multiverse',300,0,980,720);rect(s,0,0,1280,720,'linear(0deg, #080b12 0%, #080b12/91 48%, #080b12/30 100%)');text(s,'CUTLINE',66,193,790,125,105,C.white,true);text(s,'The audience changes everything.',72,349,1080,85,44,C.amber);text(s,'One room chooses the next scene.',73,491,1000,65,32,C.white);text(s,'Live demonstration',73,584,800,40,25,C.muted);text(s,'Speculative multiverse artwork',72,660,800,28,16,C.muted);}

const script='# CUTLINE: 180-second speaker script and storyboard\n\nTen timed slots total 180 seconds. Spoken copy: 390 words, averaging about 130 words per minute. Use the hard slide boundaries with any remaining time as a visual hold. Rehearse natural speaking speed against a countdown. Prewarm the provider before 00:00.\n\n'+talk.map((t,i)=>`## ${i+1}. ${t.title} (${clock(t.start)}–${clock(t.end)}, ${t.duration}s)\n\n**Say:** ${t.words}\n\n**Picture:** ${t.visual}\n\n**Operator:** ${t.action}\n\n**At ${clock(t.end)}:** advance, or end at 03:00.\n`).join('\n')+'\n## Sources\n\n'+[...new Set(talk.flatMap(t=>t.sources))].map(x=>'- '+x).join('\n')+'\n';
const wordCount=talk.reduce((total,t)=>total+t.words.trim().split(/\s+/u).length,0);
if(talk.length!==10||elapsed!==180||wordCount!==390)throw Error('Expected 10 slides, 180 seconds, and 390 spoken words.');
await fs.writeFile(path.join(ROOT,'script.md'),script);
await fs.writeFile(path.join(ROOT,'storyboard.json'),JSON.stringify({durationSeconds:180,slides:talk},null,2));
const candidate=path.join(ROOT,'.build','candidate.pptx');
const final=path.join(OUTPUT,'CUTLINE-3-minute-pitch.pptx');
await (await PresentationFile.exportPptx(P)).save(candidate);
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:final,pythonExecutable:PY,integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','8','--require-native-table-slide','9'],explicitTotalSlideCount:10,requiredNativeTableOwnerSlides:[8,9],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[FONT]},verifyArtifactToolImport:true,receiptPath:path.join(ROOT,'.build','validation.json')});
await renderDeck(final);
if(args.includes('--pdf'))await exportPdf(final);
console.log(JSON.stringify({pptx:result.finalPath,slides:10,seconds:180,words:wordCount}));

async function renderDeck(input){
 const deck=await PresentationFile.importPptx(await FileBlob.load(input));
 const tiles=[];
 for(let i=0;i<deck.slides.items.length;i++){
  const slide=deck.slides.items[i];
  const png=await deck.export({slide,format:'png',scale:1});
  const file=path.join(ROOT,'renders',`slide-${String(i+1).padStart(2,'0')}.png`);
  await fs.writeFile(file,new Uint8Array(await png.arrayBuffer()));
  const tile=await sharp(file).resize(384,216).png().toBuffer();
  tiles.push({input:tile,left:16+(i%3)*400,top:16+Math.floor(i/3)*232});
 }
 // Assemble verified single-slide renders. The library montage route misrenders connector slides.
 await sharp({create:{width:1216,height:16+Math.ceil(deck.slides.items.length/3)*232,channels:3,background:'#080b12'}}).composite(tiles).webp({quality:94}).toFile(path.join(ROOT,'contact-sheet.webp'));
}
async function exportPdf(input){
 const soffice=requiredEnv('RUNTIME_SOFFICE');
 const profile=pathToFileURL(path.join(ROOT,'.build','lo-profile')).href;
 const result=spawnSync(soffice,['--headless',`-env:UserInstallation=${profile}`,'--convert-to','pdf','--outdir',OUTPUT,input],{encoding:'utf8',env:process.env});
 if(result.status!==0)throw Error(`Bundled LibreOffice PDF export failed: ${result.stderr||result.stdout}`);
 const pdf=path.join(OUTPUT,path.basename(input,path.extname(input))+'.pdf');
 await fs.access(pdf);
 console.log(`PDF exported: ${pdf}`);
}
