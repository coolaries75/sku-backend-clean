// In createIndex.js

const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/sku_database', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Confirm connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', async () => {
    console.log('✅ Connected to MongoDB');

    try {
        // Check if model already exists to avoid OverwriteModelError
       if (!mongoose.models.SKU) {
    const skuSchema = new mongoose.Schema({
        serialNumber: { type: Number, unique: true } // Unique on Serial Number
    });
    mongoose.model('SKU', skuSchema, 'skus');
}


        // Ensure Indexes are created
        const SKU = mongoose.model('SKU');
        await SKU.init(); // Ensures indexes are created
        console.log("✅ Unique index on SKU created");
    } catch (error) {
        console.error("Error creating unique index:", error);
    } finally {
        mongoose.connection.close();
    }
});
