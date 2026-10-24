import mongoose from "mongoose";
const schema = new mongoose.Schema({
  date:{type:Date,required:true,unique:true},
  apprehended:Number,
  cbpCustody:Number,
  transfers:Number,
  hhsCare:Number,
  discharges:Number
},{timestamps:true});
export default mongoose.model("DailyRecord",schema);
