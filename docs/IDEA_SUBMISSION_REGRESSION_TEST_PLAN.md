# Idea Submission Regression Test Plan

Use this checklist for regression testing the idea submission workflows. Test in a sandbox or UAT environment before production.

---

## Prerequisites

- [ ] User has **Idea_User** or **Idea_Admin** permission set assigned
- [ ] Idea Submit component is on the Home page (or target page)
- [ ] At least one user has **Idea_Admin** permission set (for admin notification tests)

---

## 1. Form Display & Required Fields

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Navigate to the page with the Idea Submit component | Form displays with sections: Details, Classification, Visibility | |
| 1.2 | Verify **Title** field | Red asterisk (*) visible; placeholder "What's your idea?" | |
| 1.3 | Verify **Description** field | Red asterisk (*) visible; placeholder mentions "at least 5 words" | |
| 1.4 | Verify **Improvement Type** | Dual listbox with Process, Policy, Digital, Other | |
| 1.5 | Verify **Customer / Employee Impact** | Text input, optional | |
| 1.6 | Verify **Tags** | Tag input with hint "Press Enter or comma to add" | |
| 1.7 | Verify **Visibility** | Dropdown with "Private" and "Open"; default = Private | |
| 1.8 | Verify **Submit Idea** button | Centered at bottom; no Cancel button | |

---

## 2. Client-Side Validation

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | Leave Title and Description blank; click **Submit Idea** | Toast: "Missing information - Title and Description are required." | |
| 2.2 | Enter Title only; leave Description blank; click **Submit Idea** | Same toast as 2.1 | |
| 2.3 | Enter Description only; leave Title blank; click **Submit Idea** | Same toast as 2.1 | |
| 2.4 | Enter Title + Description with fewer than 5 words (e.g. "One two three"); click **Submit Idea** | Toast: "Description too short - Description must contain at least five words." | |
| 2.5 | Enter Title + Description with 5+ words | No validation toast; submit proceeds | |

---

## 3. Successful Submission – Happy Path

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Enter Title: "Regression test idea" | Value persists | |
| 3.2 | Enter Description: "This is a regression test idea with enough words for validation." | Value persists | |
| 3.3 | Select Improvement Type: Digital | Selected in right column | |
| 3.4 | Enter Customer Impact: "Improves testing efficiency" | Value persists | |
| 3.5 | Add tags: type "regression" + Enter, type "test" + Enter | Two pills appear; can remove with × | |
| 3.6 | Set Visibility: Open | Dropdown shows Open | |
| 3.7 | Click **Submit Idea** | Button shows loading state (disabled) | |
| 3.8 | Wait for response | Toast: "Idea submitted - Your idea has been submitted for review." | |
| 3.9 | Verify form state | Form clears: all fields reset to defaults | |
| 3.10 | Verify idea in list | Switch to "My Ideas" or "All Visible Ideas"; new idea appears with Status = Submitted | |
| 3.11 | Open the idea record | Title, Description, Status, Visibility, Tags, Improvement Type, Customer Impact all correct | |

---

## 4. Server-Side Validation (Bypass Client)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | Use browser dev tools or API to submit with blank Title | Error toast: "Title is required." | |
| 4.2 | Submit with blank Description | Error toast: "Description is required." | |
| 4.3 | Submit with Description &lt; 5 words | Error toast: "Description must contain at least five words." | |

---

## 5. Visibility Behavior

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Submit idea with **Private** visibility as User A | Idea created | |
| 5.2 | As User A, view "My Ideas" | Idea appears | |
| 5.3 | As different User B (no admin), view "All Visible Ideas" | Idea does **not** appear | |
| 5.4 | As User with Idea_Admin, view "Admin View" | Idea appears | |
| 5.5 | Submit idea with **Open** visibility as User A | Idea created | |
| 5.6 | As User B, view "All Visible Ideas" | Idea appears | |

---

## 6. Post-Submission – Admin Notification

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | Submit a new idea | Idea created | |
| 6.2 | Check email for users with Idea_Admin permission set | Email received: Subject "New Idea Submitted: [Title]"; body includes title and description | |
| 6.3 | If no Idea_Admin users exist | No error; submission still succeeds | |

---

## 7. Form Reset & Multiple Submissions

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | Submit idea successfully | Form clears | |
| 7.2 | Immediately submit another idea with new data | Second idea created; form clears again | |
| 7.3 | Submit; during loading, verify button | Submit Idea button is disabled | |

---

## 8. Visibility Dropdown & UI

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 8.1 | Open Visibility dropdown | Options fully visible (not cut off) | |
| 8.2 | Select "Open" | Value updates; dropdown closes | |

---

## 9. Improvement Type (Multiselect)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 9.1 | Move "Digital" and "Process" to Selected | Both appear in Selected column | |
| 9.2 | Submit idea | Idea saved with Improvement_Type__c = "Digital;Process" (or equivalent) | |
| 9.3 | Submit with no Improvement Type selected | Idea saved; field empty or null | |

---

## 10. Tags

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 10.1 | Type "tag1" + Enter | Pill appears | |
| 10.2 | Type "tag2" + comma | Second pill appears | |
| 10.3 | Click × on a pill | Tag removed | |
| 10.4 | Submit with tags | Idea saved with Tags__c = "tag1;tag2" (semicolon-separated) | |
| 10.5 | Try adding duplicate tag | Duplicate not added | |

---

## 11. Error Handling

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 11.1 | Simulate server error (e.g. revoke object permission, then restore) | Error toast displayed; form does **not** clear; Submit button re-enabled | |
| 11.2 | After error, fix data and resubmit | Submission succeeds | |

---

## 12. Object Validation Rules (Backend)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 12.1 | Admin updates status to **Implemented** without Resolution Notes | Validation error: "Resolution notes are required when closing an idea as Implemented or Not Pursued." | |
| 12.2 | Admin updates status to **Not Pursued** without Resolution Notes | Same validation error | |
| 12.3 | Admin moves status to **Acknowledged** from Submitted (skip Under Review) | Validation error: "Acknowledged is only allowed when moving from Under Review." | |

---

## 13. Permissions

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 13.1 | User **without** Idea_User or Idea_Admin | Idea Submit component not visible or access denied | |
| 13.2 | User with Idea_ReadOnly only | Verify expected behavior (may not have create access) | |

---

## Sign-Off

| Tester Name | Date | Environment | Overall Result |
|-------------|------|-------------|---------------|
| | | | Pass / Fail |

---

## Notes

- Run `IdeaTestDataSeeder.seed()` in Execute Anonymous if you need test data.
- For admin tests, ensure at least one user has **Idea_Admin** permission set.
- Status values: Submitted, Under Review, In Progress, Implemented, Not Pursued, Acknowledged.
