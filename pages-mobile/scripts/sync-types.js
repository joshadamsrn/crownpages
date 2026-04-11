const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../../crown-pages-types');
const targetDir = path.resolve(__dirname, '../node_modules/@crown-pages/types');

async function syncTypes() {
  try {
    console.log('🔄 Syncing @crown-pages/types...');

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(targetDir));

    // Remove existing symlink or directory
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }

    // Copy the entire directory
    await fs.copy(sourceDir, targetDir, {
      dereference: true, // Follow symlinks
    });

    console.log('✅ Successfully synced @crown-pages/types');
  } catch (error) {
    console.error('❌ Error syncing types:', error);
    process.exit(1);
  }
}

syncTypes();
