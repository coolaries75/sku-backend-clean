require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// ✅ Apply CORS **before defining routes**
const allowedOrigins = [
    "http://localhost:3001",
    "http://192.168.0.174:3001",
 "http://localhost:3000",  // ✅ Add this to allow Webpack Dev Server
    "http://192.168.0.174:3000"
];

// ✅ Allow requests from any device in the local network dynamically
app.use(cors({
    origin: function (origin, callback) {
      console.log("⛔ BLOCKED REQUEST from Origin:", origin);  
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed for this origin"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));


// ✅ Middleware - Ensure proper data handling
app.use(express.json()); // ✅ Parses JSON requests
app.use(express.urlencoded({ extended: true })); // ✅ Parses URL-encoded data

// ✅ Dynamically set the MongoDB URI based on environment variables
const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sku_database';

// ✅ Connect to MongoDB
mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`🔗 Active Database: ${dbURI.split('/').pop()}`); // ✅ Log the database name dynamically
 // Load test routes
const testRoutes = require('./routes/TestItem');
app.use('/api/test', testRoutes);

// ✅ Test Route - Confirms API is Running
app.get("/", (req, res) => {
    res.status(200).json({ message: "✅ API is running successfully!" });
});   
    const PORT = 4000;
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
});

// ✅ Define SKU Schema
const SKU = require('./models/app');

// ✅ Define Location Schema
const LocationSchema = new mongoose.Schema({
    type: { type: String, enum: ["horizontal", "vertical"], required: true },
    value: { type: String, required: true, unique: true }
});

const Location = mongoose.model('Location', LocationSchema);

// Define Category Schema
const CategorySchema = new mongoose.Schema({
    friendlyName: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, maxlength: 4 },
    type: { type: String, enum: ["category", "subcategory"], required: true }
});

const Category = mongoose.model('Category', CategorySchema);

// Route to Generate Unique SKU
app.post('/api/generateSKU', async function (req, res) {
    try {
        const { column, row, category, subcategory } = req.body;

        if (!column || !row || !category) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        // Fetch the last inserted SKU to determine the next serial number
        const lastSKU = await SKU.findOne().sort({ serialNumber: -1 });

        // Generate next serial number (increment last one)
        let nextSerial = lastSKU ? lastSKU.serialNumber + 1 : 1;
        let serialStr = nextSerial.toString().padStart(4, '0'); // Ensure 4-digit format (0001, 0002, etc.)

        // Generate Date Code (MMYY)
        const date = new Date();
        const month = ("0" + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear().toString().slice(-2);
        const dateCode = `${month}${year}`;

        // Construct SKU
        const generatedSKU = `${column}${row}-${serialStr}-${dateCode}-${category}`;

        res.json({ sku: generatedSKU, serialNumber: nextSerial });
    } catch (error) {
        res.status(500).json({ message: "Error generating SKU", error });
    }
});

// Route to Check for Duplicate SKU
app.get('/api/checkSKU', async (req, res) => {
    try {
        const { sku } = req.query;

        if (!sku) {
            return res.status(400).json({ message: "SKU is required" });
        }

        const existingSKU = await SKU.findOne({ sku });
        res.json({ exists: !!existingSKU });
    } catch (error) {
        console.error("Error checking SKU:", error);
        res.status(500).json({ message: "Server Error", error });
    }
});

// Route to Save SKU to Database
app.post('/api/saveSKU', async function (req, res) {
    try {
        // Log incoming data for debugging
        console.log("Incoming SKU Data:", req.body);

        // Destructure incoming data
        const { column, row, category, subcategory, sku, cost, price, storageRoom, description, status } = req.body;

        // Check if SKU is provided
        if (!sku) {
            return res.status(400).json({ message: "SKU is required" });
        }

        // Create new SKU document
        const newSKU = new SKU({
            column,
            row,
            serialNumber: parseInt(sku.split("-")[1]), // Extract serial number from SKU format
            sku,
            category,
            subcategory,
            cost: cost || 0,
            price: price || 0,
            storageRoom,
            description, // Include description
            status: status || "Active", // Include status (default: Active)
        });

        // Save to database
        await newSKU.save();
        res.json({ message: "SKU saved successfully", sku });
    } catch (error) {
        console.error("Error saving SKU:", error);
        res.status(500).json({ message: "Error saving SKU", error });
    }
});

// Route to Retrieve All SKUs
app.get('/api/getSKUs', async (req, res) => {
    try {
        const skus = await SKU.find({}, { 
            sku: 1, 
            column: 1, 
            row: 1, 
            category: 1, 
            subcategory: 1, 
            serialNumber: 1,
            description: 1, // Include description
            status: 1, // Include status
        });
        res.json(Array.isArray(skus) ? skus : []);
    } catch (error) {
        console.error("Error fetching SKUs:", error);
        res.status(500).json({ message: "Server Error", error });
    }
});
// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok", message: "Backend is running" });
});
// Route to Retrieve a Specific SKU
app.get("/api/getSKU", async (req, res) => {
    try {
        const { sku } = req.query; // Get SKU from request query

        if (!sku) {
            return res.status(400).json({ error: "SKU parameter is required" });
        }

        const foundSKU = await SKU.findOne({ sku: sku });

        if (!foundSKU) {
            return res.status(404).json({ error: "SKU not found" });
        }

        res.json(foundSKU); // Return SKU details
    } catch (error) {
        console.error("Error fetching SKU:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Route for checking serial number uniqueness
app.get('/api/checkSerialNumber', async (req, res) => {
    try {
        const { serialNumber } = req.query;

        if (!serialNumber) {
            return res.status(400).json({ message: "Serial Number is required" });
        }

        const existingSerial = await SKU.findOne({ serialNumber });
        res.json({ exists: !!existingSerial });
    } catch (error) {
        console.error("Error checking Serial Number:", error);
        res.status(500).json({ message: "Server Error", error });
    }
});

// Route to Retrieve Locations
app.get('/api/getLocations', async (req, res) => {
    try {
        const horizontal = await Location.find({ type: "horizontal" }).select('value -_id');
        const vertical = await Location.find({ type: "vertical" }).select('value -_id');
        res.json({ 
            horizontal: Array.isArray(horizontal) ? horizontal.map(loc => loc.value) : [], 
            vertical: Array.isArray(vertical) ? vertical.map(loc => loc.value) : [] 
        });
    } catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).json({ message: "Server Error", error });
    }
});

// Route to Add Location
app.post('/api/addLocation', async (req, res) => {
    try {
        const { type, value } = req.body;

        if (!type || !value) {
            return res.status(400).json({ message: "Type and value are required" });
        }

        const newLocation = new Location({ type, value });
        await newLocation.save();
        res.json({ message: "Location saved successfully", location: newLocation });
    } catch (error) {
        console.error("Error saving location:", error);
        res.status(500).json({ message: "Server Error", error });
    }
});

// Route to Remove Location
app.post('/api/removeLocation', async (req, res) => {
    const { type, value } = req.body;

    try {
        // Check if the location is in use
        const isLocationInUse = await SKU.findOne({ [type === "horizontal" ? "column" : "row"]: value });

        if (isLocationInUse) {
            return res.status(400).json({ message: "Cannot remove this location because it is in use by existing SKUs." });
        }

        // Remove the location from the database
        const result = await Location.findOneAndDelete({ type, value });

        if (!result) {
            return res.status(404).json({ message: "Location not found." });
        }

        res.json({ message: "Location removed successfully!" });
    } catch (error) {
        console.error("Error removing location:", error);
        res.status(500).json({ message: "Failed to remove location. Please try again." });
    }
});

// Route to Update SKU Location
app.put('/api/updateSKU/:id', async (req, res) => {
    const { id } = req.params;
    const { column, row, description, status } = req.body;

    try {
        // Fetch the existing SKU
        const existingSKU = await SKU.findById(id);
        if (!existingSKU) {
            return res.status(404).json({ error: "SKU not found" });
        }

        // Regenerate the SKU string
        const parts = existingSKU.sku.split('-');
        const newSKU = `${column}${row}-${parts[1]}-${parts[2]}-${parts[3]}`;

        // Update the SKU with the new column, row, SKU string, description, and status
        const updatedSKU = await SKU.findByIdAndUpdate(
            id,
            { column, row, sku: newSKU, description, status },
            { new: true } // Return the updated document
        );

        res.status(200).json(updatedSKU);
    } catch (error) {
        console.error('Error updating SKU:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Catch-All Route for 404 Errors
app.use((req, res) => {
    console.error("404 Not Found:", req.originalUrl);
    res.status(404).json({ message: "API route not found" });
});