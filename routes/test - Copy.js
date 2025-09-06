// routes/test.js
const express = require('express');
const router = express.Router();
const TestItem = require('../Models/TestItem');

router.get('/test-mongo', async (req, res) => {
  try {
    const testData = new TestItem({ name: 'Sample Item', quantity: 5 });
    await testData.save();

    const found = await TestItem.findOne({ name: 'Sample Item' });
    res.json({ message: '✅ MongoDB test success!', item: found });
  } catch (err) {
    res.status(500).json({ error: '❌ MongoDB test failed', details: err.message });
  }
});

module.exports = router;
