import setup from '../playwright/global-setup';

(async () => {
  try {
    await setup();
    console.log('Playwright global-setup completed.');
  } catch (e) {
    console.error('Error in global-setup:', e);
    process.exit(1);
  }
})();
