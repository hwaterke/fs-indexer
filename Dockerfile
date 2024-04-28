FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN ./bin/run help

FROM node:18-alpine
ARG server_version
WORKDIR /app
ENV EXIFTOOL_VERSION=12.68
RUN apk add --no-cache perl make
RUN wget https://exiftool.org/Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz && \
    tar -xzf Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz && \
    rm Image-ExifTool-${EXIFTOOL_VERSION}.tar.gz && \
    cd Image-ExifTool-${EXIFTOOL_VERSION} && \
    perl Makefile.PL && \
    make install && \
    cd .. && \
    rm -rf Image-ExifTool-${EXIFTOOL_VERSION}
COPY package.json package-lock.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/bin ./bin/
RUN exiftool -ver
RUN ./bin/run help
