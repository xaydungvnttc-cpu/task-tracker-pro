#!/usr/bin/env bash
# Cho lịch nhắc việc trên GitHub Actions đọc/ghi Firestore mà KHÔNG cần tải khóa nào (Workload Identity Federation).
# Chạy một lần trong Cloud Shell của dự án Firebase:
#   curl -sL https://raw.githubusercontent.com/xaydungvnttc-cpu/task-tracker-pro/main/scripts/setup-github-google.sh | bash
# Chỉ repo xaydungvnttc-cpu/task-tracker-pro mới được dùng quyền này, và chỉ có quyền dữ liệu Firestore.
set -euo pipefail
P=task-tracker-pro-809d9
SA=nhac-viec@$P.iam.gserviceaccount.com
R=xaydungvnttc-cpu/task-tracker-pro

gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project "$P"
gcloud iam service-accounts describe "$SA" --project "$P" >/dev/null 2>&1 ||
  gcloud iam service-accounts create nhac-viec --display-name "Nhac viec GitHub Actions" --project "$P"
gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:$SA" --role roles/datastore.user --condition=None --quiet >/dev/null
gcloud iam workload-identity-pools describe github --location global --project "$P" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location global --display-name "GitHub" --project "$P"
gcloud iam workload-identity-pools providers describe github --location global --workload-identity-pool github --project "$P" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github --location global --workload-identity-pool github \
    --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition "assertion.repository=='$R'" --project "$P"
N=$(gcloud projects describe "$P" --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding "$SA" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository/$R" \
  --project "$P" --quiet >/dev/null
echo "WIF_OK project_number=$N"
