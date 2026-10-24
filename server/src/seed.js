import "dotenv/config";
import fs from "fs";
import mongoose from "mongoose";
import { parse } from "csv-parse/sync";
import DailyRecord from "./models/DailyRecord.js";

const uri =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/uac_predictive_intelligence";
const csv = fs.readFileSync(
  new URL("../data/training.csv", import.meta.url),
  "utf8",
);
const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
});
const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  return Number(String(v).replace(/,/g, ""));
};
const cleaned = rows
  .map((r) => ({
    date: new Date(r.Date),
    apprehended: num(r["Children apprehended and placed in CBP custody*"]),
    cbpCustody: num(r["Children in CBP custody"]),
    transfers: num(r["Children transferred out of CBP custody"]),
    hhsCare: num(r["Children in HHS Care"]),
    discharges: num(r["Children discharged from HHS Care"]),
  }))
  .filter(
    (r) =>
      !isNaN(r.date.getTime()) &&
      [r.transfers, r.hhsCare, r.discharges].every(Number.isFinite),
  )
  .sort((a, b) => a.date - b.date);
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
} catch (error) {
  console.error(
    `MongoDB connection failed for ${uri}. Start MongoDB or set MONGODB_URI in server/.env.`,
  );
  console.error(error.message);
  process.exit(1);
}
await DailyRecord.deleteMany({});
await DailyRecord.insertMany(cleaned);
console.log(
  `Imported ${cleaned.length} valid observations from ${rows.length} CSV rows.`,
);
await mongoose.disconnect();
