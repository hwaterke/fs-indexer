FROM node:22-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache alpine-sdk python3
RUN npm install
COPY src ./src
COPY bin ./bin
COPY tsconfig.json ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV EXIFTOOL_VERSION=12.87
RUN apk add --no-cache perl make xxhash b3sum ffmpeg tiff libheif imagemagick
RUN wget https://exiftool.org/Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz && \
    tar -xzf Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz && \
    rm Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz && \
    cd Image-ExifTool-${EXIFTOOL_VERSION} && \
    perl Makefile.PL && \
    make install && \
    cd .. && \
    rm -rf Image-ExifTool-${EXIFTOOL_VERSION}
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps alpine-sdk python3 && \
    npm install --production && \
    apk del .build-deps
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/bin ./bin/
