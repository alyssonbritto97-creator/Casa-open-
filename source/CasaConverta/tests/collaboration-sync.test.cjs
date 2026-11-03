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
