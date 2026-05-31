# Deploy backend to Google Cloud Run

Backend production uses:

- GitHub repository: `manhquang04/EXE202`
- Cloud Build config: `cloudbuild.yaml`
- Container definition: `backend/Dockerfile`
- Artifact Registry repository: `wander-tale`
- Cloud Run service: `wander-tale-api`
- Region: `asia-southeast1`

The container includes the compiled Fastify API, the hotel booking agent, browser scripts,
and the Chromium runtime required by Playwright.

## 1. Prepare the Google Cloud project

Open Cloud Shell in Google Cloud Console and set your project ID:

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud config set project "$PROJECT_ID"
```

Enable the required APIs:

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com
```

Create the Docker image repository:

```bash
gcloud artifacts repositories create wander-tale \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="WanderTale backend images"
```

## 2. Grant Cloud Build deployment permissions

```bash
export BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

## 3. Create required runtime secrets

Create three required secrets:

```bash
printf '%s' 'https://YOUR_PROJECT.supabase.co' | \
  gcloud secrets create wander-tale-supabase-url --data-file=-

printf '%s' 'YOUR_SUPABASE_SERVICE_ROLE_KEY' | \
  gcloud secrets create wander-tale-supabase-service-role-key --data-file=-

printf '%s' 'YOUR_GEMINI_API_KEY' | \
  gcloud secrets create wander-tale-gemini-api-key --data-file=-
```

Grant the default Cloud Run runtime service account permission to read them:

```bash
export RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## 4. Deploy the first revision

Connect GitHub repository `manhquang04/EXE202` in:

```text
Google Cloud Console > Cloud Build > Repositories
```

Then open Cloud Shell, clone the repository, and submit the first build:

```bash
git clone https://github.com/manhquang04/EXE202.git
cd EXE202
gcloud builds submit --config cloudbuild.yaml .
```

The build uses the required Secret Manager values automatically. Optional runtime
variables can be configured later in:

```text
Google Cloud Console > Cloud Run > wander-tale-api > Edit and deploy new revision
```

Optional variables:

```text
GOOGLE_MAPS_API_KEY
VIETMAP_API_KEY
PEXELS_API_KEY
TRIP_PLACES_PHOTOS_ENABLED=true
TRIP_STAGED_GENERATION=true
TRIP_OTA_HARD_DEADLINE_MS=90000
TRIP_OTA_SITES=booking,agoda,vntrip
```

`TRIP_PLACES_PHOTOS_ENABLED`, `TRIP_STAGED_GENERATION`, `TRIP_OTA_HARD_DEADLINE_MS`, and
`TRIP_OTA_SITES` are already configured by `cloudbuild.yaml`.

## 5. Create automatic deploys from GitHub

Open:

```text
Google Cloud Console > Cloud Build > Triggers > Create trigger
```

Use:

```text
Name: wander-tale-main
Event: Push to a branch
Repository: manhquang04/EXE202
Branch: ^main$
Configuration: Cloud Build configuration file
Location: cloudbuild.yaml
```

Every push to `main` will build a new image, push it to Artifact Registry, and deploy a
new Cloud Run revision.

## 6. Configure mobile apps

After Cloud Run reports a service URL such as:

```text
https://wander-tale-api-xxxxx.asia-southeast1.run.app
```

set it as the production `API_URL` in:

- Android: `mobile/local.properties`
- iOS: `apps/app-ios/Config.xcconfig`

Then rebuild the release apps.
