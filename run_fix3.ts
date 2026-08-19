// @ts-nocheck
import { fixAllCompetencies } from './src/app/actions/transactions';
import { auth } from '@/auth';

// Mock auth for CLI execution
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'thailer' } })
}));

async function run() {
  console.log('Running fix...');
  try {
    const result = await fixAllCompetencies();
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

run();
