# Development store only. Build upstream source because binary URLs returned 410.
FROM golang:1.24.8-bookworm AS build
WORKDIR /src
RUN git clone https://github.com/minio/minio.git . && git checkout --detach 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a
RUN CGO_ENABLED=0 go build -trimpath -o /minio .
FROM debian:bookworm-20250908-slim
RUN useradd --uid 10001 --create-home retro && mkdir /data && chown retro:retro /data
COPY --from=build /minio /usr/local/bin/minio
COPY --from=build /src/LICENSE /usr/share/doc/minio/LICENSE
USER retro
EXPOSE 9000
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--address", ":9000"]
