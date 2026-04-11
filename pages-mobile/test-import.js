// Test if @crown-pages/types can be imported
const types = require('@crown-pages/types');

console.log('✅ Successfully imported @crown-pages/types');
console.log('Available exports:', Object.keys(types));
console.log('Section types:', Object.keys(types.SECTION_DEFINITIONS));
console.log('Has linksWithContact:', 'linksWithContact' in types.SECTION_DEFINITIONS);
