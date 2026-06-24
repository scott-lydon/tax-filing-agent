# Tax sources (TY 2025)

All figures below were verified by web search on 2026-06-24 and are encoded in `tax/brackets-2025.json`. Tax year 2025 reflects the One Big Beautiful Bill Act (OBBBA, enacted July 2025), which raised the standard deduction above the original Rev. Proc. 2024-40 amounts and set the Child Tax Credit at $2,200 per qualifying child.

## Standard deduction (2025, OBBBA-adjusted)

| Filing status | 2025 standard deduction |
|---|---|
| Single | $15,750 |
| Married filing separately | $15,750 |
| Married filing jointly | $31,500 |
| Qualifying surviving spouse | $31,500 |
| Head of household | $23,625 |

Sources:
- Tax Foundation, "2025 Tax Brackets and Federal Income Tax Rates" (retrieved 2026-06-24): https://taxfoundation.org/data/all/federal/2025-tax-brackets/
- Kiplinger, "A New Standard Deduction for 2025 is Here" (retrieved 2026-06-24): https://www.kiplinger.com/taxes/the-new-standard-deduction-is-here
- IRS Rev. Proc. 2024-40 (original 2025 inflation adjustments): https://www.irs.gov/pub/irs-drop/rp-24-40.pdf

## Marginal tax brackets (2025)

Seven rates: 10, 12, 22, 24, 32, 35, 37 percent. Thresholds are on taxable income.

### Single
10% $0 to $11,925 · 12% to $48,475 · 22% to $103,350 · 24% to $197,300 · 32% to $250,525 · 35% to $626,350 · 37% above $626,350

### Married filing jointly (and qualifying surviving spouse)
10% $0 to $23,850 · 12% to $96,950 · 22% to $206,700 · 24% to $394,600 · 32% to $501,050 · 35% to $751,600 · 37% above $751,600

### Head of household
10% $0 to $17,000 · 12% to $64,850 · 22% to $103,350 · 24% to $197,300 · 32% to $250,500 · 35% to $626,350 · 37% above $626,350

### Married filing separately
Statutory rule: brackets are half the married-filing-jointly thresholds. 10% $0 to $11,925 · 12% to $48,475 · 22% to $103,350 · 24% to $197,300 · 32% to $250,525 · 35% to $375,800 · 37% above $375,800

Source: Tax Foundation, "2025 Tax Brackets and Federal Income Tax Rates" (retrieved 2026-06-24): https://taxfoundation.org/data/all/federal/2025-tax-brackets/ . Married-filing-separately top thresholds derived as half of the joint thresholds per the standing statutory rule (the Tax Foundation page omits the separate column).

## Child Tax Credit (2025, OBBBA)

- Up to $2,200 per qualifying child under 17.
- Up to $1,700 of that is refundable as the Additional Child Tax Credit (ACTC); earned income of at least $2,500 is required for the refundable portion.
- Full credit if modified adjusted gross income is at most $200,000 (single, head of household, married filing separately) or $400,000 (married filing jointly). Phases out $50 per $1,000 above the threshold.

Sources:
- IRS, "Child Tax Credit" (retrieved 2026-06-24): https://www.irs.gov/credits-deductions/individuals/child-tax-credit
- IRS, "Instructions for Schedule 8812 (Form 1040) (2025)" (retrieved 2026-06-24): https://www.irs.gov/instructions/i1040s8
- CNBC, "The child tax credit for 2025 and how to claim it" (retrieved 2026-06-24): https://www.cnbc.com/select/what-is-the-child-tax-credit/

## Form 1040 (2025) line numbers used

| Line | Meaning |
|---|---|
| 1a | Total amount from Form W-2 box 1 (wages) |
| 9 | Total income |
| 11 | Adjusted gross income |
| 12 | Standard deduction |
| 15 | Taxable income |
| 16 | Tax |
| 19 | Child tax credit / credit for other dependents (from Schedule 8812) |
| 22 | Tax after credits |
| 24 | Total tax |
| 25a | Federal income tax withheld from Form W-2 |
| 25d | Total federal income tax withheld |
| 33 | Total payments |
| 34 | Overpayment (refund) |
| 37 | Amount you owe |

Source: official IRS 2025 Form 1040 fillable PDF, saved to `assets/f1040-2025.pdf` from https://www.irs.gov/pub/irs-prior/f1040--2025.pdf (retrieved 2026-06-24). Actual AcroForm field names are enumerated in `tax/PDF_FIELDS.md`.
