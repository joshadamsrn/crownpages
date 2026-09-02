Obtain Media Desktop Worker
===========================

This is the local helper for Crown Pages Obtain Media.

Why it exists:
- the web app discovers and organizes metadata
- the local worker downloads bulk files to the desktop
- unused media stays local and can be deleted easily

Recommended workflow:
1. In the Crown Pages web builder, run Obtain Media.
2. Wait for the crawl to complete.
3. Click Download Worker Manifest.
4. Save the manifest JSON somewhere convenient.
5. Download these helper files:
   - desktop_worker.py
   - Mac: run_obtain_media_worker.command
   - Windows: run_obtain_media_worker.bat
6. Run the worker with the manifest.

Mac:
- Double-click run_obtain_media_worker.command
- or drag the manifest JSON onto that file

Windows:
- Double-click run_obtain_media_worker.bat
- or drag the manifest JSON onto that file

Manual run:
- Mac:
  python3 desktop_worker.py --manifest ~/Downloads/company-desktop-manifest.json
- Windows:
  py desktop_worker.py --manifest C:\Users\YourName\Downloads\company-desktop-manifest.json

What it creates:
By default it writes to:
  ~/Desktop/[Company Name]/
or on Windows:
  C:\Users\YourName\Desktop\[Company Name]\

Inside that folder it creates:
- [Company Name] Photos
- [Company Name] PDFs
- [Company Name] Videos
- [Company Name] Reports

It also writes:
- social-links.csv
- discovery-report.txt
- failed-downloads.txt if any downloads fail

Notes:
- This worker only downloads files listed in the manifest.
- It does not upload files back into Supabase.
- Engineers can review the Desktop folder and only import the files they actually want to use.
