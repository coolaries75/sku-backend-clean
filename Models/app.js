const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
  column: { type: String, default: null },
  row: { type: String, default: null },
  serialNumber: { type: Number, unique: true, required: true },
  dateCode: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String },
  cost: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  storageRoom: { type: String },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "Active" }, // keep this untouched
  sku: { type: String } // legacy full SKU string
});

// Virtual SKU generator
skuSchema.virtual('generatedSku').get(function () {
  const serial = this.serialNumber.toString().padStart(4, '0');
  const loc = this.column && this.row ? `${this.column}${this.row}-` : '';
  return `${loc}${serial}-${this.dateCode}-${this.category}`;
});

// Virtual storage status
skuSchema.virtual('storageStatus').get(function () {
  return this.column && this.row ? 'Stored' : 'Unstored';
});

// Validation: column and row must be paired
skuSchema.pre('validate', function (next) {
// Auto-generate dateCode if missing
  if (!this.dateCode) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    this.dateCode = `${mm}${yy}`;
  }
// Validation: column and row must be paired
  const bothEmpty = !this.column && !this.row;
  const bothFilled = this.column && this.row;
  if (!(bothEmpty || bothFilled)) {
    return next(new Error("Both 'column' and 'row' must be either filled or empty."));
  }
  next();
});

module.exports = mongoose.model('SKU', skuSchema);
