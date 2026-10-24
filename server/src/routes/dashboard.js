import express from "express";
import DailyRecord from "../models/DailyRecord.js";
import { trainRecentModel, forecastRows } from "../ml.js";
const router=express.Router();

async function allRows(){return DailyRecord.find().sort({date:1}).lean();}
router.get("/history",async(_req,res)=>{res.json(await allRows());});

router.get("/dashboard",async(_req,res)=>{
 const rows=await allRows(); const latest=rows.at(-1); const last7=rows.slice(-7);
 const nip=latest.transfers-latest.discharges; const dor=latest.transfers>0?latest.discharges/latest.transfers:null;
 const avgNip=last7.reduce((s,r)=>s+r.transfers-r.discharges,0)/last7.length;
 const capacity=2600; const reserve=capacity-latest.hhsCare;
 const tsat=avgNip>0?reserve/avgNip:Infinity;
 let status="Normal Operations"; if(avgNip>0&&tsat<14)status="Surge Emergency"; else if(avgNip>0&&tsat<30)status="Advisory Watch";
 const trained=trainRecentModel(rows);
 res.json({census:latest.hhsCare,nip,dor:Number(dor?.toFixed(2)),avgNip:Number(avgNip.toFixed(2)),forecastMae:Number(trained.mae.toFixed(2)),forecastMape:Number(trained.mape.toFixed(2)),naiveMae:Number(trained.naiveMae.toFixed(2)),capacity,reserve:Number(reserve.toFixed(0)),tsat:Number.isFinite(tsat)?Number(tsat.toFixed(1)):null,status,observations:rows.length,dataStart:rows[0].date,dataEnd:latest.date,windowStart:trained.windowStart,trainCount:trained.trainCount,testCount:trained.testCount});
});

router.get("/benchmarks",async(_req,res)=>{
 const rows=await allRows(); const trained=trainRecentModel(rows);
 const recent=rows.filter(r=>r.date>=new Date("2024-06-01")); const usable=recent.slice(7); const split=Math.floor(usable.length*.8); const test=usable.slice(split);
 const actual=test.map(r=>r.hhsCare); const mean=recent.slice(0,split).reduce((s,r)=>s+r.hhsCare,0)/split;
 const meanMae=actual.reduce((s,v)=>s+Math.abs(v-mean),0)/actual.length;
 res.json([
  {model:"Recent-Window Random Forest",window:"Post-Jun 2024",mae:Number(trained.mae.toFixed(2)),mape:Number(trained.mape.toFixed(2))},
  {model:"Naïve Persistence",window:"Same holdout",mae:Number(trained.naiveMae.toFixed(2)),mape:null},
  {model:"Training-Window Mean",window:"Same holdout",mae:Number(meanMae.toFixed(2)),mape:null}
 ]);
});

router.get("/discharges",async(_req,res)=>{const rows=await allRows(); const avg=rows.slice(-7).reduce((s,r)=>s+r.discharges,0)/7; res.json(Array.from({length:14},(_,i)=>({day:i+1,value:Math.round(avg)})));});

router.get("/forecast",async(req,res)=>{const horizon=Math.min(Math.max(Number(req.query.horizon||30),1),30);const scenario=req.query.scenario||"base";const rows=await allRows();const trained=trainRecentModel(rows);let points=forecastRows(rows,trained.model,horizon);points=points.map(p=>({...p,optimistic:Math.round(p.base-(p.day*2.5)),pessimistic:Math.round(p.base+(p.day*4)),upper:Math.round(p.base+(p.day*1.5)+Math.sqrt(p.day)*4),lower:Math.round(p.base-(p.day*1.5)-Math.sqrt(p.day)*4),value:scenario==="optimistic"?Math.round(p.base-p.day*2.5):scenario==="pessimistic"?Math.round(p.base+p.day*4):p.base}));res.json({horizon,scenario,model:"Recent-Window Random Forest",mae:trained.mae,mape:trained.mape,historical:rows.slice(-14),points});});

router.get("/stress",async(req,res)=>{const rows=await allRows();const current=rows.at(-1).hhsCare;const capacity=Number(req.query.capacity||2600);const nip=Number(req.query.nip||15);const days=Math.min(Math.max(Number(req.query.days||30),1),90);const reserve=capacity-current;const tsat=nip>0?reserve/nip:Infinity;let status="Normal Operations";if(nip>0&&tsat<14)status="Surge Emergency";else if(nip>0&&tsat<30)status="Advisory Watch";res.json({capacity,nip,current,reserve,tsat:Number.isFinite(tsat)?Number(tsat.toFixed(1)):null,status,trajectory:Array.from({length:days},(_,i)=>({day:i+1,census:current+nip*(i+1)}))});});
export default router;
