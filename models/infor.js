const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const infoSchema = new Schema({
    weight:Number,
    height:Number,
    date:Date
});

module.exports = mongoose.model("Info", infoSchema);