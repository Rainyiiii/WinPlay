const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const workflow=require('../src/ui/workflow.js');
const app=fs.readFileSync(require.resolve('../src/ui/app.js'),'utf8');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function fixture(){
 const nodes=new Map(),calls=[],pages=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,hidden:false,dataset:{},focus(){},scrollIntoView(){}});return nodes.get(id)};
 const context={config:{wirelessMode:'hotspot'},receiverBusy:false,receiverOperation:0,running:false,activeSnapshot:'',authReady:false,displayError:'',pendingSaves:new Set(),failedSaves:new Set(),document:{activeElement:{blur(){}}},$:node,WinPlayWorkflow:workflow,refreshWorkflow(){},lockConnectionInputs(){},showPage:page=>pages.push(page),result(){},toast(){},window:{winplayAudio:{prepare:async()=>{}}},call:async op=>{calls.push(op);return {ok:true,auth:true}}};
 vm.createContext(context);
 vm.runInContext(app.slice(app.indexOf('async function startReceiver(){'),app.indexOf('function selected(')),context);
 return {context,node,calls,pages};
}
test('connection comparison ignores live volume, appearance and inactive network settings',()=>{
 const a={wirelessMode:'hotspot',ssid:'fixture',width:1280,fps:60};
 const snapshot=workflow.connectionSnapshot(a);
 assert.equal(snapshot,workflow.connectionSnapshot({...a,mediaVolume:.3,language:'en',lanSsid:'other'}));
 assert.notEqual(snapshot,workflow.connectionSnapshot({...a,fps:30}));
 assert.notEqual(snapshot,workflow.connectionSnapshot({...a,wirelessMode:'lan'}));
 assert.equal(snapshot,workflow.connectionSnapshot({...a,fps:30,...{fps:60}}));
});
test('LAN validation identifies the first field; hotspot can read credentials during start',()=>{
 assert.equal(workflow.firstNetworkError({wirelessMode:'hotspot'}),null);
 const config={wirelessMode:'lan',lanSsid:'fixture',lanPassword:'12345678',lanChannel:36};
 assert.equal(workflow.firstNetworkError(config),null);
 for(const [patch,field] of [[{lanSsid:' '},'ssid'],[{lanPassword:'short'},'password'],[{lanChannel:1.5},'channel'],[{lanAccessPointMac:'oops'},'lanAccessPointMac']])assert.equal(workflow.firstNetworkError({...config,...patch}).field,field);
});
test('duplicate clicks start only one receiver while a settings save is pending',async()=>{
 const r=fixture(),save=deferred();r.context.pendingSaves.add(save.promise);
 const first=r.context.startReceiver();await r.context.startReceiver();assert.equal(r.context.receiverBusy,true);assert.equal(r.calls.length,0);
 r.context.pendingSaves.delete(save.promise);save.resolve({ok:true});await first;
 assert.deepEqual(r.calls,['state','start']);assert.equal(r.context.receiverBusy,false);
});
test('cancel during settings save prevents delayed startup',async()=>{
 const r=fixture(),save=deferred();r.context.pendingSaves.add(save.promise);const first=r.context.startReceiver();
 await r.context.stopReceiver();r.context.pendingSaves.delete(save.promise);save.resolve({ok:true});await first;
 assert.deepEqual(r.calls,['stop']);assert.equal(r.context.receiverBusy,false);
});
test('cancel during audio preparation also prevents delayed startup',async()=>{
 const r=fixture(),audio=deferred();r.context.window.winplayAudio.prepare=()=>audio.promise;
 const first=r.context.startReceiver();await new Promise(setImmediate);await r.context.stopReceiver();audio.resolve();await first;
 assert.deepEqual(r.calls,['state','stop']);
});
test('missing authentication opens import and does not start',async()=>{
 const r=fixture();r.context.call=async op=>{r.calls.push(op);return {ok:true,auth:false}};await r.context.startReceiver();
 assert.deepEqual(r.calls,['state']);assert.deepEqual(r.pages,['about']);assert.equal(r.node('authentication').open,true);assert.equal(r.context.receiverBusy,false);
});
test('a previous failed save blocks startup until corrected',async()=>{
 const r=fixture();r.context.failedSaves.add('ssid');await r.context.startReceiver();assert.equal(r.calls.length,0);assert.equal(r.context.receiverBusy,false);
});
test('a settings or audio failure always releases operation lock',async()=>{
 const r=fixture();r.context.window.winplayAudio.prepare=async()=>{throw Error('audio fixture')};await r.context.startReceiver();assert.equal(r.context.receiverBusy,false);
});
test('refreshing adapters preserves an explicitly selected unavailable adapter',async()=>{
 const c={networkRequest:0,config:{wirelessMode:'hotspot',networkInterface:'Disconnected adapter'},fieldKey:()=> 'networkInterface',call:async()=>({ok:true,items:[]}),$:()=>({}),selected(...args){c.selectedValue=args[2]},save(){throw Error('refresh must never save')}};
 vm.createContext(c);vm.runInContext(app.slice(app.indexOf('async function networks(){'),app.indexOf('async function bluetooth(){')),c);await c.networks();assert.equal(c.selectedValue,'Disconnected adapter');
});
test('network read completed during startup does not leave its button disabled',()=>{
 const nodes={'read-network':{disabled:true,dataset:{}},'refresh-bt':{disabled:true,dataset:{}}};
 const c={document:{querySelectorAll:()=>Object.values(nodes)},$:id=>nodes[id],networkReadBusy:true,displayLimits(){}};
 vm.createContext(c);vm.runInContext(app.slice(app.indexOf('function lockConnectionInputs('),app.indexOf('async function startReceiver(')),c);
 c.lockConnectionInputs(true);c.networkReadBusy=false;c.lockConnectionInputs(false);
 assert.equal(nodes['read-network'].disabled,false);assert.equal(nodes['refresh-bt'].disabled,false);
});
