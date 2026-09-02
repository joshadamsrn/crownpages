## Obtain Media Desktop Worker

This is the local helper for Crown Pages `Obtain Media`.

Why it exists:
- the web app should discover and organize metadata
- the local worker should download bulk files to the Mac Desktop
- unused media stays local and can be deleted easily

### Expected workflow

1. In the Crown Pages web builder, run `Obtain Media`.
2. Wait for the crawl to complete.
3. Click `Download Worker Manifest`.
4. Save the manifest JSON somewhere convenient.
5. Run the worker.

Mac:

```bash
python3 desktop_worker.py --manifest ~/Downloads/company-desktop-manifest.json
```

Or double-click:

```text
run_obtain_media_worker.command
```

You can also drag the manifest JSON file onto that `.command` file in Finder.

Windows:

```bat
py desktop_worker.py --manifest C:\Users\YourName\Downloads\company-desktop-manifest.json
```

Or double-click:

```text
run_obtain_media_worker.bat
```

You can also drag the manifest JSON file onto that `.bat` file in Explorer.

### What it creates

By default it writes to:

```text
~/Desktop/[Company Name]/
```

Inside that folder it creates:

- `[Company Name] Photos`
- `[Company Name] PDFs`
- `[Company Name] Videos`
- `[Company Name] Reports`

It also writes:

- `social-links.csv`
- `discovery-report.txt`
- `failed-downloads.txt` if any downloads fail

### Notes

- This worker only downloads files listed in the manifest.
- It does not upload files back into Supabase.
- Engineers can review the Desktop folder and only upload/import the files they actually want to use.
