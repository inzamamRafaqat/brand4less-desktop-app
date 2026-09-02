import { seedDatabase } from './seed.js';

console.log('Running database seeding...');
seedDatabase();
console.log('✅ Seeding completed!');
process.exit(0);
