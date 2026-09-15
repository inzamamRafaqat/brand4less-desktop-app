import { seedDatabase } from './seed.js';

console.log('Running database seeding with demo catalog...');
process.env.SEED_DEMO_DATA = 'true';
seedDatabase({ seedDemoData: true });
console.log('✅ Seeding completed!');
process.exit(0);
