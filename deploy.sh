#!/bin/bash

docker build -t coreykruger/blocks-api --build-arg CONFIG=./config/prod.json . && docker push coreykruger/blocks-api