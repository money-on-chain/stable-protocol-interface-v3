FROM node:20.11.0

# Author
MAINTAINER Nicolas Flores & Martin Mulone

WORKDIR /usr/src/app
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# copy environments targets
COPY .env ./
COPY .env.flipmoneyMainnet ./
COPY .env.flipmoneyTestnet ./
COPY .env.rocMainnet ./
COPY .env.rocTestnet ./
COPY .env.stablexTestnet ./
COPY .env.votingMainnet ./
COPY .env.votingTestnet ./

# build script target
COPY build_target.sh ./
COPY prepare_target.sh ./

CMD /bin/bash -c 'bash ./build_target.sh'
