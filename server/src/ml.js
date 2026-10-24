import { RandomForestRegression } from "ml-random-forest";

export function makeFeatures(rows, i) {
  const r = rows[i];
  const lag = (field, n) => rows[i-n]?.[field] ?? r[field];
  const mean = (field, n) => {
    const start = Math.max(0, i-n+1);
    const vals = rows.slice(start, i+1).map(x=>Number(x[field])).filter(Number.isFinite);
    return vals.reduce((a,b)=>a+b,0)/(vals.length||1);
  };
  return [
    r.transfers, r.discharges, r.cbpCustody, r.apprehended,
    lag("hhsCare",1), lag("hhsCare",3), lag("hhsCare",7),
    lag("transfers",1), lag("transfers",3), lag("transfers",7),
    lag("discharges",1), lag("discharges",3), lag("discharges",7),
    mean("hhsCare",7), mean("transfers",7), mean("discharges",7),
    i % 7
  ];
}

export function trainRecentModel(rows) {
  const clean = rows.filter(r => Number.isFinite(r.hhsCare) && Number.isFinite(r.transfers) && Number.isFinite(r.discharges));
  const windowStart = new Date("2024-06-01T00:00:00Z");
  const recent = clean.filter(r => r.date >= windowStart);
  const usable = recent.slice(7);
  const split = Math.max(1, Math.floor(usable.length * 0.8));
  const trainRows = usable.slice(0, split);
  const testRows = usable.slice(split);
  const X = trainRows.map(r => makeFeatures(recent, recent.indexOf(r)));
  const y = trainRows.map(r => r.hhsCare);
  const model = new RandomForestRegression({ nEstimators: 120, maxFeatures: 0.75, seed: 42 });
  model.train(X, y);
  const actual = testRows.map(r => r.hhsCare);
  const predicted = testRows.map(r => model.predict([makeFeatures(recent, recent.indexOf(r))])[0]);
  const mae = actual.reduce((s,v,i)=>s+Math.abs(v-predicted[i]),0)/actual.length;
  const mape = actual.reduce((s,v,i)=>s+(Math.abs(v-predicted[i])/Math.max(Math.abs(v),1)),0)/actual.length*100;
  const naive = testRows.map(r => {
    const idx = recent.indexOf(r); return recent[idx-1]?.hhsCare ?? r.hhsCare;
  });
  const naiveMae = actual.reduce((s,v,i)=>s+Math.abs(v-naive[i]),0)/actual.length;
  return { model, mae, mape, naiveMae, trainCount:trainRows.length, testCount:testRows.length, windowStart:"2024-06-01" };
}

export function forecastRows(rows, model, horizon) {
  const work = rows.map(r=>({...r}));
  const out=[];
  const futureTransfers = rows.slice(-7).reduce((s,r)=>s+r.transfers,0)/7;
  const futureDischarges = rows.slice(-7).reduce((s,r)=>s+r.discharges,0)/7;
  for(let step=1;step<=horizon;step++){
    const last=work.at(-1);
    const date=new Date(last.date); date.setUTCDate(date.getUTCDate()+1);
    const synthetic={date,transfers:futureTransfers,discharges:futureDischarges,cbpCustody:last.cbpCustody,apprehended:last.apprehended,hhsCare:last.hhsCare};
    work.push(synthetic);
    const idx=work.length-1;
    const pred=Math.max(0,model.predict([makeFeatures(work,idx)])[0]);
    work[idx].hhsCare=pred;
    out.push({day:step,date:date.toISOString(),base:Math.round(pred)});
  }
  return out;
}
