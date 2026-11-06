'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('source/CasaConverta/app/src/main/assets/index.html','utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'painel precisa conter um script');
const script = match[1].replace(/\nload\(true\);\s*\nsetInterval\(\(\) => load\(false\), 2500\);\s*$/,'');
assert.notEqual(script,match[1],'o teste deve remover o bootstrap da página');
const dom = { addEventListener(){}, querySelector(){ return null; }, hidden:false };
const context = vm.createContext({
  document:dom,
  window:{ addEventListener(){} },
  location:{hostname:'localhost'},
  localStorage:{getItem(){return '';},removeItem(){}},
  sessionStorage:{getItem(){return '';},removeItem(){}},
  setTimeout(){}, setInterval(){},
  Date, Math, Intl, JSON, Number, String, Set, Map, Array,
});
vm.runInContext(script, context, {timeout:2000});
const start = new Date();
const weekday = (start.getDay()+6)%7;
start.setDate(start.getDate()-weekday);
start.setHours(0,0,0,0);
const weekdayNight = new Date(start);
weekdayNight.setDate(weekdayNight.getDate()+1);
weekdayNight.setHours(22,30,0,0);
const oldWeek = new Date(start);
oldWeek.setDate(oldWeek.getDate()-2);
const day = (date)=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
const data = {
  members:[
    {id:1,name:'Cliente Exemplo 01',position:1,active:true},
    {id:2,name:'Cliente Exemplo 02',position:2,active:true},
    {id:3,name:'Cliente Exemplo 03',position:3,active:true}
  ],
  items:[
    {id:1,name:'Arroz',bought:true,bought_by:1,bought_at:weekdayNight.getTime(),added_by:1,created:weekdayNight.getTime()},
    {id:2,name:'Pão',bought:true,bought_by:1,bought_at:oldWeek.getTime(),added_by:2,created:oldWeek.getTime()}
  ],
  expenses:[
    {id:1,member_id:2,amount:55000,date:day(start)},
    {id:2,member_id:3,amount:90000,date:day(oldWeek)}
  ],
  settings:{start_date:day(start)},
  overrides:{},menu:[]
};
vm.runInContext('S='+JSON.stringify(data),context);
const summary=vm.runInContext('collaborationSummary()',context);
assert.equal(summary.participants,3);
assert.equal(summary.participated,2);
assert.equal(summary.stats[0].bought,1,'compra feita à noite conta para semana');
assert.equal(summary.stats[0].requests,1);
assert.equal(summary.stats[1].records,1);
assert.equal(summary.stats[1].paid,55000);
assert.equal(summary.stats[2].paid,0,'despesa de outra semana não deve contar');
const screen=vm.runInContext('colabora()',context);
assert.ok(screen.includes('Cliente Exemplo 01'));
assert.ok(screen.includes('Sem compras ou despesas registradas'));
assert.ok(html.includes("setInterval(() => load(false), 2500)"),'atualização periódica local');
assert.ok(html.includes("cache: 'no-store'"),'leitura precisa evitar resposta cacheada');
assert.ok(html.includes("pendingState"),'atualizações não devem apagar digitação em andamento');
assert.ok(html.includes("syncBox"),'indicador de conexão');
console.log('Casa+: colaboração semanal, compras noturnas e sincronização LAN — testes OK');

// ---- Open House: casa, comida, água, estoque, custos, colaboração ----
const docsData = {
  parts:[{id:1,key:'roof',status:'broken',resp:1,helpers:[2],est:5000000,yearly:600000,last:day(oldWeek)},{id:2,key:'wall',status:'ok',last:day(start)}],
  pantry:[{id:3,name:'Arroz',qty:2,unit:'kg',min:1,perMonth:4,price:8000},{id:4,name:'Ovos',qty:0,unit:'un',min:1,perMonth:20,price:1500}],
  water:[{id:5,key:'stock',liters:30,date:day(start)}],
  bills:[{id:6,name:'Energia',kind:'energia',amount:300000,day:5}],
  pets:[{id:7,name:'Rex',emo:'x',daily:300,bag:10,bagDate:day(start),monthly:200000}],
  vehicles:[{id:8,name:'Carro',km:1000,yearly:1200000}],
  chores:[{id:9,title:'Lavar louça',freq:1,resp:2,helpers:[3]}],
  fixlog:[{id:10,type:'chore',ref:'9',title:'x',by:3,date:day(start)}]
};
vm.runInContext('S.docs='+JSON.stringify(docsData),context);
const hs=vm.runInContext('houseStats()',context);
assert.equal(hs.broken,1); assert.equal(hs.ok,1);
assert.equal(vm.runInContext("partInfo('roof').resp",context),1);
const stock=vm.runInContext('stockRows()',context);
assert.equal(stock[0].x.name,'Ovos','item sem estoque aparece primeiro');
assert.ok(Math.abs(stock.find(r=>r.x.name==='Arroz').months-0.5)<1e-9);
assert.equal(vm.runInContext('stockGoal()',context),6,'meta padrão de 6 meses');
const pv=vm.runInContext('previstoData()',context);
assert.equal(pv.lines.find(l=>l.k==='bills').v,300000);
assert.equal(pv.lines.find(l=>l.k==='pets').v,200000);
assert.equal(pv.lines.find(l=>l.k==='veh').v,100000);
assert.equal(pv.once[0].v,5000000,'conserto estimado pendente');
assert.ok(vm.runInContext('waterState().perDay',context)>0);
assert.ok(vm.runInContext('alerts()',context).length>0);
assert.ok(vm.runInContext('areaResponsibles()',context).length>=8);
const s2=vm.runInContext('collaborationSummary()',context);
assert.equal(s2.stats[2].tasks,1,'tarefa feita conta na colaboração');
// ícones: emojis viram ícones de linha e somem de <option>
const de=vm.runInContext("deEmoji('<b>💧 ok</b><option>🏠 x</option><text>❗</text>')",context);
assert.ok(de.includes('<svg')&&!/💧|🏠|❗/u.test(de)&&de.includes('>!<'));
// idioma
vm.runInContext("LANG='es'",context);
assert.ok(vm.runInContext('colabora()',context).includes('Contribución de cada persona'));
vm.runInContext("LANG=''",context);
console.log('Open House: casa, estoque, água, custos previstos e ícones — testes OK');
// partes opcionais e obras
assert.equal(vm.runInContext("partHas('roof')",context),'yes','telhado sempre existe');
assert.equal(vm.runInContext("partHas('wall')",context),'yes','muro existe por padrão');
assert.equal(vm.runInContext("partHas('pool')",context),'no','piscina não existe por padrão');
assert.equal(vm.runInContext('houseStats().all.length',context),18,'18 partes na conta padrão');
vm.runInContext("S.docs.parts=S.docs.parts.filter(x=>x.key!=='wall'&&x.key!=='pool'); S.docs.parts.push({id:90,key:'pool',has:'future',est:45000000}); S.docs.parts.push({id:91,key:'wall',has:'no'})",context);
assert.equal(vm.runInContext('houseStats().all.length',context),17,'muro marcado como "não tem" sai da conta');
assert.equal(vm.runInContext("partHas('pool')",context),'future');
assert.equal(vm.runInContext("previstoData().once.find(o=>/Planos futuros/.test(o.n)).v",context),45000000,'plano futuro soma no custo previsto');
vm.runInContext("S.docs.works=[{id:95,title:'Piscina',kind:'build',part:'pool',status:'doing',budget:45000000,end:'2000-01-01',steps:[{t:'a',done:true},{t:'b',done:false}]}]; S.docs.workcost=[{id:96,work:95,type:'material',amount:50000000}]",context);
const wi=vm.runInContext("workInfo(S.docs.works[0])",context);
assert.equal(wi.spent,50000000); assert.ok(wi.over&&wi.late); assert.equal(wi.stepPct,50);
assert.equal(vm.runInContext("previstoData().once.find(o=>/Planos futuros/.test(o.n)).v",context),0,'obra aberta não conta duas vezes');
assert.ok(vm.runInContext('alerts()',context).some(a=>/obra atrasada/.test(a.t||a.text||JSON.stringify(a))),'alerta de obra atrasada');
assert.ok(vm.runInContext('houseSvg()',context).includes('id="z-pool"'),'piscina futura aparece no desenho');
assert.ok(!vm.runInContext('houseSvg()',context).includes('id="z-wall"'),'muro que não existe não aparece');
console.log('Open House: partes opcionais e obras — testes OK');
