const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
    column: String,
    row: String,
    serialNumber: { type: Number, unique: true },
    sku: String,
    category: String,
    subcategory: String,
    cost: Number,
    price: Number,
    storageRoom: String,
    description: { type: String, default: "" }, // Ensure this field is in the schema
    status: { type: String, default: "Active" }, // Ensure this field is in the schema
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SKU', skuSchema);
