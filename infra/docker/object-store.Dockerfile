FROM chrislusf/seaweedfs@sha256:3ce80bed9e8a7f7dae6c90e5faaa5edb57ae50f3333e5559379f142c7e1af04a

COPY infra/docker/object-store-entrypoint.sh /usr/local/bin/retro-object-store
ENTRYPOINT ["/usr/local/bin/retro-object-store"]
