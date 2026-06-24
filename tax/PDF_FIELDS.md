# IRS 2025 Form 1040 AcroForm field map (verified)

The official IRS 2025 Form 1040 (`assets/f1040-2025.pdf`, retrieved 2026-06-24 from https://www.irs.gov/pub/irs-prior/f1040--2025.pdf) was originally an XFA form. pdf-lib strips XFA, leaving AcroForm fields with opaque positional names (`f1_NN`, `c1_N`). The names below were verified on 2026-06-24 by filling each field with a sentinel value, rendering the PDF to PNG with `pdftoppm`, and reading the rendered page to confirm which line each field controls (see `scripts/fill-sentinel.mjs` and `scripts/dump-pdf-positions.mjs`). This is the source of truth for `server/pdf.ts`.

## Page 1 text fields (prefix `topmostSubform[0].Page1[0].`)

| Field | Form location |
|-------|---------------|
| `f1_14[0]` | Your first name and middle initial |
| `f1_15[0]` | Your last name |
| `f1_16[0]` | Your social security number |
| `f1_17[0]` | Spouse first name and middle initial |
| `f1_18[0]` | Spouse last name |
| `f1_19[0]` | Spouse social security number |
| `f1_20[0]` | Home address (number and street) |
| `f1_47[0]` | Line 1a, total amount from Form W-2 box 1 |
| `f1_57[0]` | Line 1z, add lines 1a through 1h |
| `f1_73[0]` | Line 9, total income |
| `f1_75[0]` | Line 11, adjusted gross income |

## Filing status checkboxes (prefix `topmostSubform[0].Page1[0].`)

Five separate checkboxes (not a radio group, per pdf-lib). Check exactly one.

| Filing status | Field |
|---------------|-------|
| Single | `Checkbox_ReadOrder[0].c1_8[0]` |
| Married filing jointly | `Checkbox_ReadOrder[0].c1_8[1]` |
| Married filing separately | `Checkbox_ReadOrder[0].c1_8[2]` |
| Head of household | `c1_8[0]` |
| Qualifying surviving spouse | `c1_8[1]` |

## Page 2 text fields (prefix `topmostSubform[0].Page2[0].`)

| Field | Form line |
|-------|-----------|
| `f2_02[0]` | Line 12, standard deduction |
| `f2_05[0]` | Line 14, add lines 12 and 13 |
| `f2_06[0]` | Line 15, taxable income |
| `f2_08[0]` | Line 16, tax |
| `f2_11[0]` | Line 19, child tax credit / credit for other dependents |
| `f2_14[0]` | Line 22, subtract line 21 from line 18 |
| `f2_16[0]` | Line 24, total tax |
| `f2_17[0]` | Line 25a, federal income tax withheld from Form W-2 |
| `f2_20[0]` | Line 25d, total withholding |
| `f2_28[0]` | Line 33, total payments |
| `f2_29[0]` | Line 34, overpayment (refund) |
| `f2_30[0]` | Line 35a, amount of line 34 you want refunded |
| `f2_35[0]` | Line 37, amount you owe |

Note: page 1 of the 2025 form ends at line 11 (AGI). Lines 12 onward are on page 2.
