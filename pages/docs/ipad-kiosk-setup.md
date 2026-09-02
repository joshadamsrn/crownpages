# CrownPages iPad Kiosk Setup Guide

Use these steps to set up an iPad as a front-desk CrownPages kiosk.

## Before You Start

- Use the iPad in landscape orientation.
- Connect the iPad to reliable Wi-Fi.
- Keep the iPad plugged into power.
- Open the exact kiosk URL for the customer page, for example:

```text
https://crownpages.com/market/aspenridgeeast/kiosk
```

Replace `market` and `aspenridgeeast` with the customer's business and page slugs.

## Add the Kiosk to the Home Screen

1. Open Safari on the iPad.
2. Go to the full kiosk URL.
3. Tap the Share button.
4. Tap **Add to Home Screen**.
5. Name it something clear, such as `Front Desk Kiosk`.
6. Tap **Add**.
7. Close Safari.
8. Open the kiosk from the new Home Screen icon.

The kiosk must be opened from the Home Screen icon, not from a normal Safari tab. This hides the Safari address bar and browser tabs.

If the Home Screen icon opens the wrong page, delete the icon and add it again from the exact kiosk URL.

## Prevent the iPad from Sleeping or Locking

1. Open **Settings**.
2. Tap **Display & Brightness**.
3. Tap **Auto-Lock**.
4. Select **Never**.

If **Never** is not available, the iPad may be managed by Screen Time, Low Power Mode, or an organization policy. Disable Low Power Mode and check any device management restrictions.

Also check:

1. Open **Settings**.
2. Tap **Battery**.
3. Turn **Low Power Mode** off.

Keep the iPad connected to power so the kiosk can stay on all day.

## Lock the iPad to the Kiosk

Use Guided Access to keep visitors from leaving the kiosk.

### Turn Guided Access On

1. Open **Settings**.
2. Tap **Accessibility**.
3. Tap **Guided Access**.
4. Turn **Guided Access** on.
5. Tap **Passcode Settings**.
6. Set a Guided Access passcode.
7. Optional: enable Face ID or Touch ID for ending Guided Access.

### Start Guided Access

1. Open the CrownPages kiosk from the Home Screen icon.
2. Triple-click the iPad Top button or Home button.
3. Tap **Options**.
4. Recommended settings:
   - Turn **Sleep/Wake Button** off.
   - Turn **Volume Buttons** off.
   - Keep **Touch** on.
   - Keep **Keyboards** on.
   - Turn **Motion** off.
   - Set **Time Limit** to off.
5. Tap **Start**.

Visitors should now be locked into the kiosk screen.

### End Guided Access

1. Triple-click the Top button or Home button.
2. Enter the Guided Access passcode.
3. Tap **End**.

## Daily Startup Checklist

1. Plug the iPad into power.
2. Confirm Wi-Fi is connected.
3. Open the kiosk from the Home Screen icon.
4. Confirm the page is in landscape orientation.
5. Start Guided Access.
6. Test one field to confirm the keyboard appears without showing Safari tabs or the address bar.

## Troubleshooting

### The Safari address bar or tabs are visible

The kiosk is probably open in Safari instead of from the Home Screen icon.

Close Safari, then open the kiosk using the Home Screen icon.

### The Home Screen icon opens CrownPages.com instead of the kiosk page

Delete the Home Screen icon and add it again while Safari is on the exact kiosk URL.

### The iPad screen turns off

Check **Settings > Display & Brightness > Auto-Lock** and set it to **Never**.

Also make sure **Settings > Battery > Low Power Mode** is off.

### Visitors can still leave the kiosk

Make sure Guided Access is running. For facilities with multiple iPads, use an MDM provider with Single App Mode for the strongest lock-down.

## Best Practice for Facilities

For one iPad, use Home Screen mode plus Guided Access.

For multiple facility iPads, use mobile device management with Single App Mode. This is more reliable than relying on Safari settings alone.
