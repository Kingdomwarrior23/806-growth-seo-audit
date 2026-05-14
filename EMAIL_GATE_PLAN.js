// Email gate modifications for worker.js
// This will be applied as patches to the existing file

/* CHANGES NEEDED:

1. Store full quick_wins array in a global variable
2. Show only 2 recommendations initially + a "locked" message
3. On email submit, reveal full list

Modify showResults function to:
- Store d.quick_wins globally
- Display only first 2 items
- Show "🔒 Unlock 3-5 more recommendations by entering your email below"

Modify emailBtn click handler to:
- After successful submission
- Reveal full quick_wins list
- Hide the email gate box
- Show success message
*/

// JavaScript modification for line 595 (badList display):
// BEFORE:
//   document.getElementById('badList').innerHTML=(d.quick_wins||[]).map(w=>'<div class=\"item item-bad\">→ '+w+'</div>').join('');

// AFTER:
window.fullQuickWins = d.quick_wins || [];
const teaserWins = window.fullQuickWins.slice(0, 2);
let badHTML = teaserWins.map(w=>'<div class=\"item item-bad\">→ '+w+'</div>').join('');
if (window.fullQuickWins.length > 2) {
  badHTML += '<div class=\"item item-bad\" style=\"opacity:0.5;font-style:italic\">🔒 '+
             (window.fullQuickWins.length - 2)+' more recommendations below — enter your email to unlock</div>';
}
document.getElementById('badList').innerHTML = badHTML;


// Email button handler modification (after line 629):
// AFTER successful GHL webhook, add:
//   Reveal full recommendations
    if (window.fullQuickWins && window.fullQuickWins.length > 2) {
      document.getElementById('badList').innerHTML = 
        window.fullQuickWins.map(w=>'<div class=\"item item-bad\">→ '+w+'</div>').join('');
    }
