# Gridiron App Launch Checklist

Gridiron can ship as a web app first, then as native iOS and Android apps through
Capacitor. Keep the store positioning simple: fictional single-player football
strategy, no real teams, no real players, no real money, no prizes.

## Local App Builds

```bash
npm run icons
npm run build
npm run build:native
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync
```

- `npm run build` keeps the `/slate-boss/` base path for hosted web builds.
- `npm run build:native` uses relative asset paths so Capacitor can load the
  game inside iOS and Android webviews.
- After changing web code, run `npm run cap:sync` before opening Xcode or Android
  Studio.

## Store Accounts

- Apple: enroll in the Apple Developer Program before TestFlight or App Store
  distribution.
- Google: create a Play Console developer account and plan for closed testing if
  using a new personal account.

## Store Listing Guardrails

- Category: Games / Card / Sports strategy.
- Short description: "A fictional football card roguelike."
- Avoid sportsbook, gambling, deposit, withdrawal, betting, DFS contest, or cash
  prize language in public store copy.
- Include the disclaimer in long-form listing text: "Gridiron uses fictional
  teams and players. It has no real-money play, prizes, deposits, or withdrawals."

## Before Submission

- Replace the bundle id in `capacitor.config.ts` if you want a different permanent
  publisher namespace before the first public release.
- Capture phone and tablet screenshots from real builds, not desktop browser
  screenshots.
- Add a privacy policy URL, even if the first release only stores local save data.
- Confirm all visible gameplay text still avoids licensed football league,
  sportsbook, and real-money claims.
