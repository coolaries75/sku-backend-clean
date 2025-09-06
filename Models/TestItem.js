const mongoose = require("mongoose");

const TestItemSchema = new mongoose.Schema({
  name: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TestItem", TestItemSchema);
