version 18.0
clear all
set more off

global PROJECT_ROOT = c(pwd)
global DATA_RAW "${PROJECT_ROOT}/data/raw"
global DATA_GENERATED "${PROJECT_ROOT}/data/generated"
global DATA_FINAL "${PROJECT_ROOT}/data/final"
global OUTPUT "${PROJECT_ROOT}/output"
global LOGS "${PROJECT_ROOT}/logs"

capture mkdir "${PROJECT_ROOT}/data"
capture mkdir "${DATA_RAW}"
capture mkdir "${DATA_GENERATED}"
capture mkdir "${DATA_FINAL}"
capture mkdir "${OUTPUT}"
capture mkdir "${LOGS}"
capture log close
log using "${LOGS}/replication.log", replace text

do "${PROJECT_ROOT}/code/10_prep_master.do"
do "${PROJECT_ROOT}/code/20_analysis_master.do"

log close
