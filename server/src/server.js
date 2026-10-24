import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dashboard from "./routes/dashboard.js";
const app = express();
app.use(cors());
app.use(express.json());
const uri =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/uac_predictive_intelligence";
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
} catch (error) {
  console.error(
    `MongoDB connection failed for ${uri}. Start MongoDB or set MONGODB_URI in server/.env.`,
  );
  console.error(error.message);
  process.exit(1);
}
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", dashboard);
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API http://localhost:${port}`));
