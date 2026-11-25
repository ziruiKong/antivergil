export function verificationEmail(code, accountName = "your account") {
  const safeCode = String(code);
  const safeName = String(accountName).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  if (!/^\d{6}$/.test(safeCode)) throw new Error("Invalid verification code");
  return {
    subject: safeCode + " · Your Antivergil sign-in code",
    text: "Please verify your identity, " + accountName + ". Your Antivergil verification code is " + safeCode + ". Enter it on the sign-in page to activate your account. This code expires in 10 minutes. If you did not request this email, you can ignore it.",
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f3f0;color:#34393d;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">Your Antivergil verification code is ${safeCode}. Valid for 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f0">
<tr><td align="center" style="padding:44px 16px 24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:8px">
<tr><td align="center" style="padding:30px 32px 16px"><img src="https://antivergil.cc/assets/antivergil-logo-cutout.png" width="118" alt="ANTIVERGIL" style="display:block;width:118px;height:auto;border:0"></td></tr>
<tr><td style="padding:10px 32px 18px;text-align:center">
<h1 style="margin:0;font-size:28px;line-height:1.25;letter-spacing:-.5px;color:#202529">Please verify your identity, ${safeName}</h1>
</td></tr>
<tr><td style="padding:0 32px 26px;text-align:center">
<p style="margin:0;font-size:16px;line-height:1.7">You're one step away from Antivergil.<br>Enter the code below on the sign-in page to verify your email and continue.</p>
</td></tr>
<tr><td align="center" style="padding:0 32px 28px">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f0f2f3;border-radius:4px"><tr><td align="center" style="padding:24px 8px;color:#151a1d;font:700 36px/1.2 'Courier New',monospace;letter-spacing:10px">${safeCode}</td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 30px">
<p style="margin:0;font-size:14px;line-height:1.7;color:#687076">This code expires in <strong style="color:#34393d">10 minutes</strong>. For your security, keep it private.</p>
</td></tr>
<tr><td align="center" style="padding:0 32px 34px">
<a href="https://antivergil.cc/login/" style="display:inline-block;padding:14px 26px;border-radius:4px;background:#161b1e;color:#ffffff;font-size:14px;line-height:1.2;font-weight:700;text-decoration:none">Return to Antivergil</a>
</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #eceef0">
<p style="margin:0;color:#7b8287;font-size:13px;line-height:1.7">Didn't request this code? You can safely ignore this email.</p>
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:0 20px 40px;font-size:12px;line-height:1.8;color:#858b90">Antivergil · Columbia Course Planner<br><a href="https://antivergil.cc" style="color:#687076;text-decoration:none">antivergil.cc</a></td></tr>
</table></body></html>`,
  };
}
