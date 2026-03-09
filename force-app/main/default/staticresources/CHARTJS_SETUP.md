# Chart.js Static Resource Setup

The **accountIndustryChart** LWC loads Chart.js from a static resource named **ChartJS**. You must add the Chart.js library file before the chart will work.

## Option A: Create the static resource in Salesforce (recommended)

1. **Download the Chart.js UMD build** (must be the UMD build so `window.Chart` is available):
   - **Minified:** https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js  
   - Or from [Chart.js releases](https://github.com/chartjs/Chart.js/releases) — use the file `chart.umd.min.js` from the `dist` folder.

2. **In Salesforce Setup:**
   - Go to **Setup** → **Static Resources** → **New**.
   - **Name:** `ChartJS` (must be exactly this — the LWC imports `@salesforce/resourceUrl/ChartJS`).
   - **File:** Upload the downloaded `chart.umd.min.js` file.
   - **Cache Control:** Public.
   - **Content Type:** application/javascript (or leave default if it detects it).
   - Click **Save**.

3. **If you use source tracking:** Retrieve the new static resource into your project so the metadata (and optionally the file) is in version control:
   ```bash
   sf project retrieve start -m StaticResource:ChartJS
   ```
   The binary will be in `force-app/main/default/staticresources/ChartJS` (no extension). You can also commit the downloaded file into that path with no extension so the project is self-contained.

## Option B: Add the file to this project and deploy

1. Download `chart.umd.min.js` from the link above.

2. Save it in this folder as a file named **`ChartJS`** (no extension):
   ```
   force-app/main/default/staticresources/ChartJS
   ```
   So the path is: `force-app/main/default/staticresources/ChartJS` with no `.js` extension. The existing `ChartJS.resource-meta.xml` describes the resource; the file `ChartJS` is the content.

3. Deploy:
   ```bash
   sf project deploy start -d force-app/main/default/staticresources
   ```

## Verify

- Open a page that includes the **Accounts by Industry** component. If Chart.js is missing, you’ll see an error like “Failed to load Chart.js” or the script will fail to load. Once the static resource is created and named **ChartJS**, the chart should render.
