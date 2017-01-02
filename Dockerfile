FROM node:latest

RUN mkdir /opt/app
COPY package.json /opt/app/package.json
WORKDIR /opt/app
RUN npm install

COPY . /opt/app/*