const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const busy=source.slice(source.indexOf('function setBusy('),source.indexOf('async function act('));
const objects=source.slice(source.indexOf('function renderSceneObjects('),source.indexOf('function renderActions('));
test('production quantity controls are enabled again after a completed action and reflect the new stock without a reload',()=>{
  const elements=new Map(),context={busy:false,currentView:{ready:true,hero:{hp:{current:12},conditions:[]},scene:{id:'camp'},items:[{id:'supplies',name:'Supplies',description:'Six packs.',quantity:6,remainingQuantity:6,locationId:'camp',collected:false,accessState:{available:true}}]},$:selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',hidden:false});return elements.get(selector);},T:String,esc:String,renderQuests:()=>{},refreshExactCast:()=>{},refreshPartyShare:()=>{},document:{body:{classList:{toggle:()=>{}}},querySelectorAll:()=>[]},module:{exports:null}};
  vm.runInNewContext(`${objects}\n${busy}\nmodule.exports=setBusy;`,context);const setBusy=context.module.exports;
  setBusy(true);assert.ok(elements.get('#sceneObjects').innerHTML.includes('name="quantity" disabled'));context.currentView.items[0].remainingQuantity=5;setBusy(false);const html=elements.get('#sceneObjects').innerHTML;assert.ok(!html.includes('name="quantity" disabled'));assert.ok(!html.includes('type="submit" disabled'));assert.ok(html.includes('Осталось: 5'));assert.ok(html.includes('<option value="5">'));assert.ok(!html.includes('<option value="6">'));
});
