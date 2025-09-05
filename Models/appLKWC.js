const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
    column: String,
    row: String,
    serialNumber: { type: Number, unique: true },// Ensure Serial Number is unique
    sku: String, // No longer unique
    category: String,
    subcategory: String,
    cost: Number,
    price: Number,
    storageRoom: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SKU', skuSchema);

