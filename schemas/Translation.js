const mongoose = require('mongoose');
const mongooseFuzzySearch = require('mongoose-fuzzy-searching');

const TranslationSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    category: String,
    id: { type: Number, min: 0 },
    content: {
        en: String,
        de: String,
        fr: String,
        pt: String
    },
    updated: { type: Date, default: Date.now }
});

TranslationSchema.index({ category: 1, id: 1 }, { unique: true });

TranslationSchema.plugin(mongooseFuzzySearch, {
    fields: [
        {
            name: 'content',
            minSize: 3,
            keys: ['en', 'de', 'fr', 'pt']
        }
    ]
});

TranslationSchema.index({
    'content_fuzzy.en_fuzzy': 'text',
    'content_fuzzy.de_fuzzy': 'text',
    'content_fuzzy.fr_fuzzy': 'text',
    'content_fuzzy.pt_fuzzy': 'text'
});

module.exports = TranslationSchema;