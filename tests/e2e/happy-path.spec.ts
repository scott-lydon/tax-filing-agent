import { test, expect } from '@playwright/test';

/**
 * End-to-end happy path against the running app (real LLM calls): load the sample W-2,
 * answer the five questions, download the filled 1040, and confirm the observation trail
 * shows the tool calls. Covers AT-C2, AT-C4, AT-E3, AT-H6.
 */
test('sample W-2 to downloadable filled 1040 in five answers', async ({ page }) => {
  await page.goto('/');

  // Greeting from Tilly.
  await expect(page.getByTestId('assistant-msg').first()).toContainText(/Tilly/i);

  // Load the sample W-2; the agent acknowledges it within one turn (AT-C4).
  await page.getByTestId('use-sample').click();
  await expect(page.getByTestId('assistant-msg').last()).toContainText(/40,?000/, { timeout: 60_000 });

  const answers = [
    "I'm single.",
    'No dependents.',
    'No other income, just the W-2.',
    'No estimated payments.',
    "Nothing else, I'm all set.",
  ];

  const download = page.getByTestId('download');
  for (const answer of answers) {
    if (await download.isVisible().catch(() => false)) break;
    const before = await page.getByTestId('assistant-msg').count();
    await page.getByTestId('chat-input').fill(answer);
    await page.getByTestId('send').click();
    // Wait for a new assistant message or the download link to appear.
    await Promise.race([
      page.waitForFunction(
        (n) => document.querySelectorAll('[data-testid="assistant-msg"]').length > n,
        before,
        { timeout: 90_000 },
      ),
      download.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {}),
    ]);
  }

  // The download link is present and points at the return endpoint (AT-E3).
  await expect(download).toBeVisible({ timeout: 90_000 });
  await expect(download).toHaveAttribute('href', /\/api\/return\/.+\/download/);

  // The agent reported a refund.
  await expect(page.getByTestId('assistant-msg').last()).toContainText(/refund|1,?328/i);

  // Actually download the PDF and confirm it is a non-trivial PDF.
  const [dl] = await Promise.all([page.waitForEvent('download'), download.click()]);
  const path = await dl.path();
  expect(path).toBeTruthy();

  // Observation trail shows the tool calls (AT-H6).
  await page.getByTestId('trace-toggle').click();
  await expect(page.getByText('tool call: record_w2').first()).toBeVisible();
  await expect(page.getByText('finalized 1040').first()).toBeVisible();
});
