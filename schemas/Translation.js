const mongoose = require('mongoose');

const TranslationSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    category: String,
    id: { type: Number, min: 0 },
    content: {
        en: { value: String, language: String },
        de: { value: String, language: String },
        fr: { value: String, language: String },
        pt: { value: String, language: String },
    },
    updated: { type: Date, default: Date.now }
});

// Ensure data integrity by detecting duplicates
TranslationSchema.index({ category: 1, id: 1 }, { unique: true });
TranslationSchema.index({ category: 1, 'content.en.value': 1, 'content.de.value': 1, 'content.fr.value': 1, 'content.pt.value': 1 }, { unique: true });

TranslationSchema.index({
    'content.en.value': 'text',
    'content.de.value': 'text',
    'content.fr.value': 'text',
    'content.pt.value': 'text',
});


module.exports = TranslationSchema;