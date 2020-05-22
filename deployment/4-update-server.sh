#!/usr/bin/env bash
set -e

## Get Current env
source utils.sh
getEnvName $1

## Include config
source config.sh
source ${ENV}/config.sh

## Set project
setProject

#####


## Call "docker-compose up -d" on github
if [[ -z ${GITHUB_RUN_ID} ]]; then
    DAEMON="";
else
    DAEMON="-d";
fi
echo "Daemon: ${DAEMON}"

echo -e "\n\n# 8/9 - Updating remote machine...\n"
gcloud compute ssh ${INSTANCE_NAME} --command="cd ${REMOTE_PATH} && docker network create nginx-proxy || true && docker-compose pull && docker-compose down && docker-compose up ${DAEMON} --remove-orphans"
#gcloud compute ssh ${INSTANCE_NAME} --command="cd ${REMOTE_PATH} && docker network create nginx-proxy || true && docker-compose pull && docker-compose up ${DAEMON} --remove-orphans"

echo -e "\n\n# 9/9 - Waiting healthy response...\n"