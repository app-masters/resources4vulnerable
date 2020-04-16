FROM node:13-alpine AS build
WORKDIR /var/www
RUN mkdir -p ./backend/dist
COPY ./backend/package.json .
RUN rm -f package-lock.json rm yarn.lock
RUN yarn install
COPY ./backend/. .
RUN yarn build

FROM node:13-alpine
WORKDIR /var/www
COPY --from=build /var/www/dist .
COPY ./backend/package.json .
COPY ./backend/.sequelizerc .
RUN date > build-date.txt
RUN yarn install --production --ignore-scripts --prefer-offline
CMD ["/bin/sh", "-c", "cd /var/www; cat build-date.txt; yarn migrate; yarn seed-production; yarn start-production; "]
