FROM node:7.5.0-wheezy

RUN mkdir /opt/app
COPY package.json /opt/app/package.json
WORKDIR /opt/app
RUN npm install

EXPOSE 8888

COPY . /opt/app

CMD ["/opt/app/entrypoint.sh"]