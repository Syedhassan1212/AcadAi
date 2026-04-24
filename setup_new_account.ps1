# AcadAi - New Account Setup Script
# This script automates API enablement and IAM permissions for a new Google Cloud Project.

$NewProjectId = "acadai-494112"

if (-not $NewProjectId) {
    Write-Error "Project ID is required. Exiting."
    return
}

Write-Host "--- 1. Setting project to $NewProjectId ---" -ForegroundColor Cyan
gcloud config set project $NewProjectId

Write-Host "--- 2. Enabling Required APIs (this may take a minute) ---" -ForegroundColor Cyan
gcloud services enable cloudbuild.googleapis.com `
                       run.googleapis.com `
                       artifactregistry.googleapis.com `
                       logging.googleapis.com

Write-Host "--- 3. Creating Artifact Registry Repository ---" -ForegroundColor Cyan
# Adjust the region if you prefer something other than europe-west1
$Region = "europe-west1"
gcloud artifacts repositories create acadai-repo `
    --repository-format=docker `
    --location=$Region `
    --description="Docker repository for AcadAi"

Write-Host "--- 4. Setting up Permissions for Cloud Build ---" -ForegroundColor Cyan
# Get the Project Number
$ProjectNumber = gcloud projects describe $NewProjectId --format="value(projectNumber)"
$CloudBuildSA = "${ProjectNumber}@cloudbuild.gserviceaccount.com"

# Grant Cloud Run Admin
gcloud projects add-iam-policy-binding $NewProjectId `
    --member="serviceAccount:$CloudBuildSA" `
    --role="roles/run.admin"

# Grant Service Account User (to allow Cloud Build to deploy as the runtime SA)
gcloud projects add-iam-policy-binding $NewProjectId `
    --member="serviceAccount:$CloudBuildSA" `
    --role="roles/iam.serviceAccountUser"

Write-Host "`n--- SETUP COMPLETE! ---" -ForegroundColor Green
Write-Host "Next Steps:"
Write-Host "1. Go to Google Cloud Console -> Cloud Build -> Triggers"
Write-Host "2. Connect your GitHub repository manually (OAuth requirement)."
Write-Host "3. Create a Trigger using 'cloudbuild.yaml' and add your Supabase/Gemini variables."
Write-Host "4. Push your code to GitHub!"
